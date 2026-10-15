import { PDFDocument, StandardFonts, rgb, degrees, PDFFont } from 'pdf-lib';
import { FOOTAGE, MEDIA, PURPOSES } from '../constants';
import { CctvRequest } from '../types';
import { dayOf, fmt12, fmtD, recTime } from './formatters';

interface CheckItem {
  checked: boolean;
  label: string;
}

type Block =
  | { type: 'section'; title: string; height?: number }
  | {
      type: 'row4';
      k1: string;
      v1: string;
      k2: string;
      v2: string;
      minH?: number;
      l1?: string[];
      c1?: string[];
      l2?: string[];
      c2?: string[];
      lh?: number;
      height?: number;
    }
  | {
      type: 'rowSpan3';
      k1: string;
      v1: string;
      l1?: string[];
      c1?: string[];
      lh?: number;
      height?: number;
    }
  | {
      type: 'rowCheckSpan3';
      k1: string;
      items: CheckItem[];
      l1?: string[];
      checkLines?: CheckItem[][];
      lh?: number;
      height?: number;
    }
  | {
      type: 'fullCheck';
      items: CheckItem[];
      lineMult?: number;
      checkLines?: CheckItem[][];
      lh?: number;
      height?: number;
    }
  | {
      type: 'fullText';
      textVal: string;
      lines?: string[];
      lh?: number;
      height?: number;
    };

export async function createCctvPdf(request: CctvRequest, logoSrc?: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28;
  const H = 841.89;
  const M = 36;
  const CW = W - M * 2;
  const ink = rgb(0, 0, 0);
  const headerInk = rgb(0.12, 0.15, 0.19);
  const muted = rgb(0.35, 0.39, 0.45);
  const borderCol = rgb(0.15, 0.15, 0.15);
  const thFill = rgb(0.851, 0.851, 0.851);
  const kFill = rgb(0.949, 0.949, 0.949);
  const accent = rgb(0.78, 0.18, 0.08);

  let brand: any = null;
  if (logoSrc) {
    try {
      let pngBytes: Uint8Array;
      if (logoSrc.startsWith('data:image/png;base64,')) {
        const b64 = logoSrc.split(',')[1];
        const bin = atob(b64);
        pngBytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) pngBytes[i] = bin.charCodeAt(i);
      } else {
        const resp = await fetch(logoSrc);
        pngBytes = new Uint8Array(await resp.arrayBuffer());
      }
      brand = await pdf.embedPng(pngBytes);
    } catch (e) {
      console.warn('Could not embed logo image in PDF:', e);
    }
  }

  const val = (x: unknown) => String(x ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ');

  const canEncode = (t: string, font: PDFFont) => {
    try {
      font.encodeText(t);
      return true;
    } catch {
      return false;
    }
  };

  const canvasContext = (_t: string, size: number, strong: boolean) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${strong ? 'bold ' : ''}${size}px Arial, sans-serif`;
    return { canvas, ctx };
  };

  const width = (t: string, size: number, font: PDFFont) =>
    canEncode(t, font)
      ? font.widthOfTextAtSize(t, size)
      : canvasContext(t, size, font === bold).ctx.measureText(t).width;

  const page = pdf.addPage([W, H]);

  async function text(
    str: string,
    x: number,
    top: number,
    size = 8.5,
    font = normal,
    color = ink
  ) {
    str = val(str);
    if (!str) return;
    if (canEncode(str, font)) {
      page.drawText(str, { x, y: H - top - size, size, font, color });
      return;
    }
    const { canvas, ctx } = canvasContext(str, size, font === bold);
    const w = ctx.measureText(str).width;
    canvas.width = Math.ceil(w * 3 + 12);
    canvas.height = Math.ceil(size * 1.8 * 3);
    ctx.scale(3, 3);
    ctx.font = `${font === bold ? 'bold ' : ''}${size}px Arial, sans-serif`;
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';
    ctx.fillText(str, 1, 0);
    const image = await pdf.embedPng(canvas.toDataURL('image/png'));
    page.drawImage(image, {
      x,
      y: H - top - canvas.height / 3,
      width: canvas.width / 3,
      height: canvas.height / 3,
    });
  }

  function wrap(value: string, max: number, size = 8.5, font = normal): string[] {
    const result: string[] = [];
    for (const paragraph of val(value).split('\n')) {
      if (!paragraph) {
        result.push('');
        continue;
      }
      let line = '';
      for (const token of paragraph.split(/(\s+)/)) {
        if (width(line + token, size, font) <= max) {
          line += token;
          continue;
        }
        if (line.trim()) {
          result.push(line.trimEnd());
          line = '';
        }
        const word = token.trimStart();
        for (const char of word) {
          if (width(line + char, size, font) > max && line) {
            result.push(line);
            line = '';
          }
          line += char;
        }
      }
      result.push(line.trimEnd());
    }
    return result;
  }

  function buildCheckItems(list: readonly string[], sel: string[], oth?: string): CheckItem[] {
    return list.map((o) => {
      const on = (sel || []).includes(o);
      const label = o.startsWith('Other') && on && oth ? `${o}: ${val(oth)}` : o;
      return { checked: on, label };
    });
  }

  function wrapCheckItems(items: CheckItem[], maxWidth: number, size = 8.5): CheckItem[][] {
    const boxW = 11;
    const gapW = 14;
    const lines: CheckItem[][] = [];
    let curLine: CheckItem[] = [];
    let curW = 0;
    for (const item of items) {
      const itemW = boxW + width(item.label, size, normal);
      if (curLine.length > 0 && curW + gapW + itemW > maxWidth) {
        lines.push(curLine);
        curLine = [item];
        curW = itemW;
      } else {
        curW += (curLine.length > 0 ? gapW : 0) + itemW;
        curLine.push(item);
      }
    }
    if (curLine.length > 0) lines.push(curLine);
    return lines;
  }

  async function drawCheckLines(
    checkLines: CheckItem[][],
    startX: number,
    startTop: number,
    size: number,
    lineHeight: number
  ) {
    const boxSize = 7.2;
    const boxW = 11;
    const gapW = 14;
    for (let i = 0; i < checkLines.length; i++) {
      const lineTop = startTop + i * lineHeight;
      let curX = startX;
      for (const item of checkLines[i]) {
        const by = H - lineTop - size + 0.6;
        page.drawRectangle({
          x: curX,
          y: by,
          width: boxSize,
          height: boxSize,
          borderColor: ink,
          borderWidth: 0.65,
          color: rgb(1, 1, 1),
        });
        if (item.checked) {
          page.drawLine({
            start: { x: curX + 1.3, y: by + 3.6 },
            end: { x: curX + 3.0, y: by + 1.6 },
            thickness: 1.15,
            color: ink,
          });
          page.drawLine({
            start: { x: curX + 3.0, y: by + 1.6 },
            end: { x: curX + 5.9, y: by + 5.7 },
            thickness: 1.15,
            color: ink,
          });
        }
        await text(item.label, curX + boxW, lineTop, size, normal, ink);
        curX += boxW + width(item.label, size, normal) + gapW;
      }
    }
  }

  const blocks: Block[] = [];
  const addSection = (title: string) => blocks.push({ type: 'section', title });
  const addRow4 = (k1: string, v1: string, k2: string, v2: string, minH = 18) =>
    blocks.push({ type: 'row4', k1, v1, k2, v2, minH });
  const addRowSpan3 = (k1: string, v1: string) => blocks.push({ type: 'rowSpan3', k1, v1 });
  const addRowCheckSpan3 = (k1: string, items: CheckItem[]) =>
    blocks.push({ type: 'rowCheckSpan3', k1, items });
  const addFullCheckRow = (items: CheckItem[], lineMult = 1.65) =>
    blocks.push({ type: 'fullCheck', items, lineMult });
  const addFullTextRow = (textVal: string) => blocks.push({ type: 'fullText', textVal });

  addSection('SECTION A \u2013 INFORMATION');
  addRow4('Request Date', fmtD(request.reqDate), 'Request Time', fmt12(request.reqTime));
  addRow4('Requestor Name', request.name, 'Employee ID', request.empId);
  addRow4('Department', request.dept, 'Position', request.pos);
  addRow4('Contact Number', request.contact, 'Email Address', request.email);

  addSection('SECTION B \u2013 PURPOSE');
  addFullCheckRow(buildCheckItems(PURPOSES, request.purposes, request.purposeOther), 1.65);

  addSection('SECTION C \u2013 RECORDING DETAILS');
  addRow4('Area / Location', request.area, 'Day', dayOf(request.recDate));
  addRow4('Date', fmtD(request.recDate), 'Time', recTime(request));

  addSection('SECTION D \u2013 FOOTAGE REQUEST');
  addFullCheckRow(buildCheckItems(FOOTAGE, request.footage, request.footageOther), 1.65);

  addSection('STORAGE MEDIA REQUESTED');
  addFullCheckRow(buildCheckItems(MEDIA, request.media, request.mediaOther), 1.45);

  addSection('SECTION E \u2013 DECLARATION');
  addFullTextRow(
    'I acknowledge that CCTV footage contains confidential and sensitive information. I agree that the footage will only be used for the approved investigation purpose and will not be copied, distributed, disclosed, or used for unauthorized purposes. I understand that any misuse may result in disciplinary or legal action.'
  );
  addRow4('Requestor Signature', request.ack ? request.sigName : '', 'Date', fmtD(request.sigDate));

  addSection('SECTION F \u2013 SECURITY REVIEW');
  addRow4('Received By', request.recvBy, 'Received Date', fmtD(request.recvDate));
  addRowSpan3('Reviewed By', request.revBy);
  addRowCheckSpan3(
    'Footage Available?',
    ['Yes', 'No'].map((x) => ({ checked: request.avail === x, label: x }))
  );
  addRowCheckSpan3(
    'Recording Quality',
    ['Good', 'Fair', 'Poor'].map((x) => ({ checked: request.quality === x, label: x }))
  );

  addSection('SECTION G \u2013 APPROVAL');
  addRow4('Approver Signature', request.apprName, 'Date', fmtD(request.apprDate), 38);

  const kWidth = CW * 0.19;
  const vWidth = CW * 0.31;
  const span3Width = CW - kWidth;

  const measure = (sz: number) =>
    blocks.map((b) => {
      const lh = sz * 1.25;
      if (b.type === 'section') {
        return { ...b, height: 17 };
      }
      if (b.type === 'row4') {
        const l1 = wrap(b.k1, kWidth - 10, sz, bold);
        const c1 = wrap(b.v1, vWidth - 10, sz, normal);
        const l2 = wrap(b.k2, kWidth - 10, sz, bold);
        const c2 = wrap(b.v2, vWidth - 10, sz, normal);
        const maxLines = Math.max(l1.length, c1.length, l2.length, c2.length, 1);
        return { ...b, l1, c1, l2, c2, lh, height: Math.max(b.minH || 18, maxLines * lh + 8) };
      }
      if (b.type === 'rowSpan3') {
        const l1 = wrap(b.k1, kWidth - 10, sz, bold);
        const c1 = wrap(b.v1, span3Width - 10, sz, normal);
        const maxLines = Math.max(l1.length, c1.length, 1);
        return { ...b, l1, c1, lh, height: Math.max(18, maxLines * lh + 8) };
      }
      if (b.type === 'rowCheckSpan3') {
        const l1 = wrap(b.k1, kWidth - 10, sz, bold);
        const checkLines = wrapCheckItems(b.items, span3Width - 12, sz);
        const maxLines = Math.max(l1.length, checkLines.length, 1);
        return { ...b, l1, checkLines, lh, height: Math.max(18, maxLines * lh + 8) };
      }
      if (b.type === 'fullCheck') {
        const lineH = sz * (b.lineMult || 1.6);
        const checkLines = wrapCheckItems(b.items, CW - 12, sz);
        return { ...b, checkLines, lh: lineH, height: Math.max(18, checkLines.length * lineH + 7) };
      }
      if (b.type === 'fullText') {
        const lines = wrap(b.textVal, CW - 12, sz, normal);
        return { ...b, lines, lh, height: Math.max(18, lines.length * lh + 8) };
      }
      return b;
    });

  const tableTop = 82;
  const available = H - tableTop - 36;
  let size = 8.5;
  let layout = measure(size);
  while (layout.reduce((n, b) => n + (b.height || 0), 0) > available) {
    size *= 0.95;
    layout = measure(size);
    if (size < 4) break;
  }

  let y = tableTop;

  if (brand) {
    page.drawImage(brand, { x: M, y: H - 49, width: 99, height: 25 });
  } else {
    await text('SALS', M, 26, 18, bold, accent);
  }
  const codeText = 'OEF-25 Rev 02';
  await text(codeText, W - M - width(codeText, 10, bold), 28, 10, bold, headerInk);
  await text('CCTV Footage Request Form', M, 58, 13.5, bold, headerInk);

  const box = (x: number, top: number, w: number, h: number, fill?: any) =>
    page.drawRectangle({
      x,
      y: H - top - h,
      width: w,
      height: h,
      borderColor: borderCol,
      borderWidth: 0.65,
      ...(fill ? { color: fill } : {}),
    });

  for (const block of layout) {
    const bHeight = block.height || 18;
    if (block.type === 'section') {
      box(M, y, CW, bHeight, thFill);
      await text(block.title, M + 5, y + 4.2, size, bold, ink);
    } else if (block.type === 'row4') {
      const x1 = M,
        x2 = M + kWidth,
        x3 = x2 + vWidth,
        x4 = x3 + kWidth;
      box(x1, y, kWidth, bHeight, kFill);
      box(x2, y, vWidth, bHeight);
      box(x3, y, kWidth, bHeight, kFill);
      box(x4, y, vWidth, bHeight);
      for (let i = 0; i < (block.l1?.length || 0); i++)
        await text(block.l1![i], x1 + 5, y + 4.2 + i * block.lh!, size, bold, ink);
      for (let i = 0; i < (block.c1?.length || 0); i++)
        await text(block.c1![i], x2 + 5, y + 4.2 + i * block.lh!, size, normal, ink);
      for (let i = 0; i < (block.l2?.length || 0); i++)
        await text(block.l2![i], x3 + 5, y + 4.2 + i * block.lh!, size, bold, ink);
      for (let i = 0; i < (block.c2?.length || 0); i++)
        await text(block.c2![i], x4 + 5, y + 4.2 + i * block.lh!, size, normal, ink);
    } else if (block.type === 'rowSpan3') {
      const x1 = M,
        x2 = M + kWidth;
      box(x1, y, kWidth, bHeight, kFill);
      box(x2, y, span3Width, bHeight);
      for (let i = 0; i < (block.l1?.length || 0); i++)
        await text(block.l1![i], x1 + 5, y + 4.2 + i * block.lh!, size, bold, ink);
      for (let i = 0; i < (block.c1?.length || 0); i++)
        await text(block.c1![i], x2 + 5, y + 4.2 + i * block.lh!, size, normal, ink);
    } else if (block.type === 'rowCheckSpan3') {
      const x1 = M,
        x2 = M + kWidth;
      box(x1, y, kWidth, bHeight, kFill);
      box(x2, y, span3Width, bHeight);
      for (let i = 0; i < (block.l1?.length || 0); i++)
        await text(block.l1![i], x1 + 5, y + 4.2 + i * block.lh!, size, bold, ink);
      if (block.checkLines) {
        await drawCheckLines(block.checkLines, x2 + 6, y + 4.2, size, block.lh!);
      }
    } else if (block.type === 'fullCheck') {
      box(M, y, CW, bHeight);
      if (block.checkLines) {
        await drawCheckLines(block.checkLines, M + 6, y + 4.8, size, block.lh!);
      }
    } else if (block.type === 'fullText') {
      box(M, y, CW, bHeight);
      for (let i = 0; i < (block.lines?.length || 0); i++)
        await text(block.lines![i], M + 5, y + 4.2 + i * block.lh!, size, normal, ink);
    }
    y += bHeight;
  }

  // Exact CONFIDENTIAL watermark
  const watermark = 'CONFIDENTIAL';
  const watermarkSize = 50;
  const angle = (40 * Math.PI) / 180;
  const watermarkWidth = bold.widthOfTextAtSize(watermark, watermarkSize);
  const watermarkHeight = bold.heightAtSize(watermarkSize, { descender: false });
  page.drawText(watermark, {
    x: W / 2 - (watermarkWidth * Math.cos(angle) - watermarkHeight * Math.sin(angle)) / 2,
    y: H / 2 - (watermarkWidth * Math.sin(angle) + watermarkHeight * Math.cos(angle)) / 2,
    size: watermarkSize,
    font: bold,
    color: rgb(0.45, 0.45, 0.45),
    rotate: degrees(40),
    opacity: 0.22,
  });

  // Bottom footer
  await text('Request ' + val(request.no), M, H - 24, 8, normal, muted);
  const footer = 'Prepared By: ' + val(request.by || 'admin');
  const footerSize = Math.min(8, (8 * (CW - 135)) / Math.max(1, width(footer, 8, normal)));
  const footerW = width(footer, footerSize, normal);
  await text(footer, W / 2 - footerW / 2, H - 24, footerSize, normal, muted);
  await text('1 / 1', W - M - 23, H - 24, 8, normal, muted);

  pdf.setTitle('CCTV Footage Request - ' + val(request.no));
  pdf.setAuthor('SALS');
  return pdf.save();
}

export async function downloadPdfFile(request: CctvRequest, logoSrc?: string) {
  const bytes = await createCctvPdf(request, logoSrc);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `OEF25_CCTV_Request_${(request.no || 'Statement').replace(/[^0-9A-Za-z_-]/g, '_')}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 60000);
}
