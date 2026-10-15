import { CctvRequest, RequestStatus } from '../types';

export const pad = (n: number | string): string => String(n).padStart(2, '0');

export const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const nowT = (): string => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fmtD = (s?: string): string => {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return y && m && d ? `${d}/${m}/${y}` : s;
};

export const fmt12 = (t?: string): string => {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return t;
  const a = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${pad(h)}:${mStr} ${a}`;
};

export const dayOf = (s?: string): string => {
  if (!s) return '';
  const dt = new Date(`${s}T00:00:00`);
  return isNaN(dt.getTime())
    ? ''
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dt.getDay()];
};

export const recTime = (r: { recFrom?: string; recTo?: string }): string => {
  if (!r.recFrom && !r.recTo) return '';
  return `${fmt12(r.recFrom) || '—'} - ${fmt12(r.recTo) || '—'}`;
};

export const purposeTxt = (r: CctvRequest): string =>
  (r.purposes || [])
    .map((p) => (p.startsWith('Other') && r.purposeOther ? `Other: ${r.purposeOther}` : p))
    .join(', ');

export const footageTxt = (r: CctvRequest): string =>
  (r.footage || [])
    .map((f) => (f.startsWith('Other') && r.footageOther ? `Other: ${r.footageOther}` : f))
    .join(', ');

export const mediaTxt = (r: CctvRequest): string =>
  (r.media || [])
    .map((m) => (m.startsWith('Other') && r.mediaOther ? `Other: ${r.mediaOther}` : m))
    .join(', ');

export const statusPillClass = (s: RequestStatus): string => {
  if (s === 'Submitted') return 'status-pill status-open';
  if (s === 'Under Review') return 'status-pill status-progress';
  if (s === 'Approved' || s === 'Released') return 'status-pill status-closed';
  return 'status-pill status-rejected';
};
