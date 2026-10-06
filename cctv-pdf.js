/* Self-hosted PDF export matching the OEF-25 Preview layout & sals-sir-online CONFIDENTIAL watermark */
(function(root){
  const PURPOSES = [
    'Security Investigation','Safety Investigation','Incident Investigation','Theft Investigation',
    'Accident','Property Damage','Near Miss','HR Investigation','Customer Complaint',
    'Insurance Claim','Audit','Legal Requirement','Other (Please Specify)'
  ];
  const FOOTAGE = ['Screenshot','Video Export','Still Images','Entire Recording','Other (Please Specify)'];
  const MEDIA = ['E-mail','Other'];

  async function createCctvPdf(request, logoSrc){
    const { PDFDocument, StandardFonts, rgb, degrees } = root.PDFLib;
    const pdf = await PDFDocument.create();
    const normal = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const W = 595.28, H = 841.89, M = 36, CW = W - M * 2;
    const ink = rgb(0, 0, 0);
    const headerInk = rgb(.12, .15, .19);
    const muted = rgb(.35, .39, .45);
    const borderCol = rgb(.15, .15, .15);
    const thFill = rgb(.851, .851, .851); // #d9d9d9 matching .pf th
    const kFill = rgb(.949, .949, .949);  // #f2f2f2 matching .pf .k
    const accent = rgb(.78, .18, .08);
    let page, y;

    let brand = null;
    if(logoSrc){
      try {
        let pngBytes;
        if(logoSrc.startsWith('data:image/png;base64,')){
          const b64 = logoSrc.split(',')[1];
          const bin = atob(b64);
          pngBytes = new Uint8Array(bin.length);
          for(let i=0; i<bin.length; i++) pngBytes[i] = bin.charCodeAt(i);
        } else {
          const resp = await fetch(logoSrc);
          pngBytes = await resp.arrayBuffer();
        }
        brand = await pdf.embedPng(pngBytes);
      } catch(e) {
        console.warn('Could not embed logo image in PDF:', e);
      }
    }

    const val = x => String(x ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
    const canEncode = (t, font) => { try { font.encodeText(t); return true; } catch { return false; } };
    const canvasContext = (t, size, strong) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.font = `${strong ? 'bold ' : ''}${size}px Arial, sans-serif`;
      return { canvas, ctx };
    };
    const width = (t, size, font) => canEncode(t, font)
      ? font.widthOfTextAtSize(t, size)
      : canvasContext(t, size, font === bold).ctx.measureText(t).width;

    async function text(str, x, top, size = 8.5, font = normal, color = ink){
      str = val(str);
      if(!str) return;
      if(canEncode(str, font)){
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
      page.drawImage(image, { x, y: H - top - canvas.height / 3, width: canvas.width / 3, height: canvas.height / 3 });
    }

    function wrap(value, max, size = 8.5, font = normal){
      const result = [];
      for(const paragraph of val(value).split('\n')){
        if(!paragraph){ result.push(''); continue; }
        let line = '';
        for(const token of paragraph.split(/(\s+)/)){
          if(width(line + token, size, font) <= max){ line += token; continue; }
          if(line.trim()){ result.push(line.trimEnd()); line = ''; }
          const word = token.trimStart();
          for(const char of word){
            if(width(line + char, size, font) > max && line){ result.push(line); line = ''; }
            line += char;
          }
        }
        result.push(line.trimEnd());
      }
      return result;
    }

    // Build checkbox option items matching printHTML's b(list, sel, oth)
    function buildCheckItems(list, sel, oth){
      return list.map(o => {
        const on = (sel || []).includes(o);
        const label = (o.startsWith('Other') && on && oth) ? (o + ': ' + val(oth)) : o;
        return { checked: on, label };
      });
    }

    // Wrap checkbox items across lines within maxWidth
    function wrapCheckItems(items, maxWidth, size = 8.5){
      const boxW = 11; // checkbox + space before label
      const gapW = 14; // space between items on a line
      const lines = [];
      let curLine = [];
      let curW = 0;
      for(const item of items){
        const itemW = boxW + width(item.label, size, normal);
        if(curLine.length > 0 && curW + gapW + itemW > maxWidth){
          lines.push(curLine);
          curLine = [item];
          curW = itemW;
        } else {
          curW += (curLine.length > 0 ? gapW : 0) + itemW;
          curLine.push(item);
        }
      }
      if(curLine.length > 0) lines.push(curLine);
      return lines;
    }

    async function drawCheckLines(checkLines, startX, startTop, size, lineHeight){
      const boxSize = 7.2;
      const boxW = 11;
      const gapW = 14;
      for(let i = 0; i < checkLines.length; i++){
        const lineTop = startTop + i * lineHeight;
        let curX = startX;
        for(const item of checkLines[i]){
          const by = H - lineTop - size + 0.6;
          page.drawRectangle({
            x: curX,
            y: by,
            width: boxSize,
            height: boxSize,
            borderColor: ink,
            borderWidth: 0.65,
            color: rgb(1, 1, 1)
          });
          if(item.checked){
            page.drawLine({
              start: { x: curX + 1.3, y: by + 3.6 },
              end: { x: curX + 3.0, y: by + 1.6 },
              thickness: 1.15,
              color: ink
            });
            page.drawLine({
              start: { x: curX + 3.0, y: by + 1.6 },
              end: { x: curX + 5.9, y: by + 5.7 },
              thickness: 1.15,
              color: ink
            });
          }
          await text(item.label, curX + boxW, lineTop, size, normal, ink);
          curX += boxW + width(item.label, size, normal) + gapW;
        }
      }
    }

    const fmtD = d => {
      if(!d) return '';
      const [yr, mo, day] = String(d).split('-');
      return (yr && mo && day) ? `${day}/${mo}/${yr}` : d;
    };
    const fmt12 = t => {
      if(!t) return '';
      const [h, m] = t.split(':');
      const numH = parseInt(h, 10);
      if(isNaN(numH)) return t;
      const am = numH < 12 ? 'AM' : 'PM';
      return `${(numH % 12 || 12).toString().padStart(2, '0')}:${m} ${am}`;
    };
    const dayOf = d => {
      if(!d) return '';
      const dt = new Date(d + 'T00:00:00');
      return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-US', { weekday: 'long' });
    };
    const recTime = r => (r.recFrom || r.recTo)
      ? `${fmt12(r.recFrom) || '—'} to ${fmt12(r.recTo) || '—'}`
      : '';

    // Exact blocks matching printHTML(r) in index.html
    const blocks = [];
    const addSection = title => blocks.push({ type: 'section', title });
    const addRow4 = (k1, v1, k2, v2, minH = 18) => blocks.push({ type: 'row4', k1, v1, k2, v2, minH });
    const addRowSpan3 = (k1, v1) => blocks.push({ type: 'rowSpan3', k1, v1 });
    const addRowCheckSpan3 = (k1, items) => blocks.push({ type: 'rowCheckSpan3', k1, items });
    const addFullCheckRow = (items, lineMult = 1.65) => blocks.push({ type: 'fullCheck', items, lineMult });
    const addFullTextRow = (textVal) => blocks.push({ type: 'fullText', textVal });

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
    addFullTextRow('I acknowledge that CCTV footage contains confidential and sensitive information. I agree that the footage will only be used for the approved investigation purpose and will not be copied, distributed, disclosed, or used for unauthorized purposes. I understand that any misuse may result in disciplinary or legal action.');
    addRow4('Requestor Signature', request.ack ? request.sigName : '', 'Date', fmtD(request.sigDate));

    addSection('SECTION F \u2013 SECURITY REVIEW');
    addRow4('Received By', request.recvBy, 'Received Date', fmtD(request.recvDate));
    addRowSpan3('Reviewed By', request.revBy);
    addRowCheckSpan3('Footage Available?', ['Yes', 'No'].map(x => ({ checked: request.avail === x, label: x })));
    addRowCheckSpan3('Recording Quality', ['Good', 'Fair', 'Poor'].map(x => ({ checked: request.quality === x, label: x })));

    addSection('SECTION G \u2013 APPROVAL');
    addRow4('Approver Signature', request.apprName, 'Date', fmtD(request.apprDate), 38);

    const kWidth = CW * 0.19;
    const vWidth = CW * 0.31;
    const span3Width = CW - kWidth;

    const measure = size => blocks.map(b => {
      const lh = size * 1.25;
      if(b.type === 'section'){
        return { ...b, height: 17 };
      }
      if(b.type === 'row4'){
        const l1 = wrap(b.k1, kWidth - 10, size, bold);
        const c1 = wrap(b.v1, vWidth - 10, size, normal);
        const l2 = wrap(b.k2, kWidth - 10, size, bold);
        const c2 = wrap(b.v2, vWidth - 10, size, normal);
        const maxLines = Math.max(l1.length, c1.length, l2.length, c2.length, 1);
        return { ...b, l1, c1, l2, c2, lh, height: Math.max(b.minH || 18, maxLines * lh + 8) };
      }
      if(b.type === 'rowSpan3'){
        const l1 = wrap(b.k1, kWidth - 10, size, bold);
        const c1 = wrap(b.v1, span3Width - 10, size, normal);
        const maxLines = Math.max(l1.length, c1.length, 1);
        return { ...b, l1, c1, lh, height: Math.max(18, maxLines * lh + 8) };
      }
      if(b.type === 'rowCheckSpan3'){
        const l1 = wrap(b.k1, kWidth - 10, size, bold);
        const checkLines = wrapCheckItems(b.items, span3Width - 12, size);
        const maxLines = Math.max(l1.length, checkLines.length, 1);
        return { ...b, l1, checkLines, lh, height: Math.max(18, maxLines * lh + 8) };
      }
      if(b.type === 'fullCheck'){
        const lineH = size * (b.lineMult || 1.6);
        const checkLines = wrapCheckItems(b.items, CW - 12, size);
        return { ...b, checkLines, lh: lineH, height: Math.max(18, checkLines.length * lineH + 7) };
      }
      if(b.type === 'fullText'){
        const lines = wrap(b.textVal, CW - 12, size, normal);
        return { ...b, lines, lh, height: Math.max(18, lines.length * lh + 8) };
      }
      return { ...b, height: 18 };
    });

    const tableTop = 82;
    const available = H - tableTop - 36;
    let size = 8.5, layout = measure(size);
    while(layout.reduce((n, b) => n + b.height, 0) > available){
      size *= 0.95;
      layout = measure(size);
      if(size < 4) break;
    }

    page = pdf.addPage([W, H]);
    y = tableTop;

    // Header with SALS logo on left, OEF-25 Rev 02 on right, title & meta below
    if(brand){
      page.drawImage(brand, { x: M, y: H - 49, width: 99, height: 25 });
    } else {
      await text('SALS', M, 26, 18, bold, accent);
    }
    const codeText = 'OEF-25 Rev 02';
    await text(codeText, W - M - width(codeText, 10, bold), 28, 10, bold, headerInk);

    await text('CCTV Footage Request Form', M, 58, 13.5, bold, headerInk);

    const box = (x, top, w, h, fill) => page.drawRectangle({
      x,
      y: H - top - h,
      width: w,
      height: h,
      borderColor: borderCol,
      borderWidth: 0.65,
      ...(fill ? { color: fill } : {})
    });

    for(const block of layout){
      if(block.type === 'section'){
        box(M, y, CW, block.height, thFill);
        await text(block.title, M + 5, y + 4.2, size, bold, ink);
      } else if(block.type === 'row4'){
        const x1 = M, x2 = M + kWidth, x3 = x2 + vWidth, x4 = x3 + kWidth;
        box(x1, y, kWidth, block.height, kFill);
        box(x2, y, vWidth, block.height);
        box(x3, y, kWidth, block.height, kFill);
        box(x4, y, vWidth, block.height);
        for(let i = 0; i < block.l1.length; i++) await text(block.l1[i], x1 + 5, y + 4.2 + i * block.lh, size, bold, ink);
        for(let i = 0; i < block.c1.length; i++) await text(block.c1[i], x2 + 5, y + 4.2 + i * block.lh, size, normal, ink);
        for(let i = 0; i < block.l2.length; i++) await text(block.l2[i], x3 + 5, y + 4.2 + i * block.lh, size, bold, ink);
        for(let i = 0; i < block.c2.length; i++) await text(block.c2[i], x4 + 5, y + 4.2 + i * block.lh, size, normal, ink);
      } else if(block.type === 'rowSpan3'){
        const x1 = M, x2 = M + kWidth;
        box(x1, y, kWidth, block.height, kFill);
        box(x2, y, span3Width, block.height);
        for(let i = 0; i < block.l1.length; i++) await text(block.l1[i], x1 + 5, y + 4.2 + i * block.lh, size, bold, ink);
        for(let i = 0; i < block.c1.length; i++) await text(block.c1[i], x2 + 5, y + 4.2 + i * block.lh, size, normal, ink);
      } else if(block.type === 'rowCheckSpan3'){
        const x1 = M, x2 = M + kWidth;
        box(x1, y, kWidth, block.height, kFill);
        box(x2, y, span3Width, block.height);
        for(let i = 0; i < block.l1.length; i++) await text(block.l1[i], x1 + 5, y + 4.2 + i * block.lh, size, bold, ink);
        await drawCheckLines(block.checkLines, x2 + 6, y + 4.2, size, block.lh);
      } else if(block.type === 'fullCheck'){
        box(M, y, CW, block.height);
        await drawCheckLines(block.checkLines, M + 6, y + 4.8, size, block.lh);
      } else if(block.type === 'fullText'){
        box(M, y, CW, block.height);
        for(let i = 0; i < block.lines.length; i++) await text(block.lines[i], M + 5, y + 4.2 + i * block.lh, size, normal, ink);
      }
      y += block.height;
    }

    // Exact CONFIDENTIAL watermark matching sals-sir-online report-pdf.js
    const watermark = 'CONFIDENTIAL', watermarkSize = 50, angle = 40 * Math.PI / 180;
    const watermarkWidth = bold.widthOfTextAtSize(watermark, watermarkSize);
    const watermarkHeight = bold.heightAtSize(watermarkSize, { descender: false });
    page.drawText(watermark, {
      x: W / 2 - (watermarkWidth * Math.cos(angle) - watermarkHeight * Math.sin(angle)) / 2,
      y: H / 2 - (watermarkWidth * Math.sin(angle) + watermarkHeight * Math.cos(angle)) / 2,
      size: watermarkSize,
      font: bold,
      color: rgb(.45, .45, .45),
      rotate: degrees(40),
      opacity: 0.22
    });

    // Bottom footer matching Preview
    await text('Request ' + val(request.no), M, H - 24, 8, normal, muted);
    const footer = 'Prepared By: ' + val(request.by || 'admin');
    const footerSize = Math.min(8, 8 * (CW - 135) / Math.max(1, width(footer, 8, normal)));
    const footerW = width(footer, footerSize, normal);
    await text(footer, W / 2 - footerW / 2, H - 24, footerSize, normal, muted);
    await text('1 / 1', W - M - 23, H - 24, 8, normal, muted);

    pdf.setTitle('CCTV Footage Request - ' + val(request.no));
    pdf.setAuthor('SALS');
    return pdf.save();
  }

  root.createCctvPdf = createCctvPdf;
})(typeof window === 'undefined' ? globalThis : window);
