export function fmtFull(n) {
  if (n===null||n===undefined||isNaN(n)) return '—';
  return (n<0?'−':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}
export function fmtDollar(n) {
  if (n===null||n===undefined||isNaN(n)) return '—';
  return (n<0?'−$':'$')+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}
export function fmtBaseSalary(n) {
  if (!n) return '';
  return n.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
}
export function parseRaw(str) {
  return parseFloat((str+'').replace(/[^0-9.]/g,'')) || 0;
}
export function fmtGridNum(v) {
  const n = parseFloat((v+'').replace(/[^0-9.-]/g,''));
  if (isNaN(n) || v === '' || v === null || v === undefined) return '';
  return n.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
}
export function parseGridNum(v) {
  return parseFloat((v+'').replace(/[^0-9.-]/g,'')) || 0;
}

// Aliases used by panel components
export const fmtSalary = fmtBaseSalary;
export function fmtNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
export function fmtDollarShort(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  if (Math.abs(n) >= 1000000) return (n < 0 ? '−' : '') + '$' + (Math.abs(n)/1000000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1000) return (n < 0 ? '−' : '') + '$' + Math.round(Math.abs(n)/1000) + 'K';
  return fmtDollar(n);
}
