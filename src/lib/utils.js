export const TC = 1400;
const _now = new Date();
export const TODAY = { y: _now.getFullYear(), m: _now.getMonth() + 1, d: _now.getDate() };

export const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const MONTH_ABBR  = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
export const DAY_NAMES   = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

export const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });

export function fARS(n) { return '$ ' + Math.round(n).toLocaleString('es-AR'); }
export function fUSD(n) { return 'US$ ' + Math.round(n).toLocaleString('es-AR'); }
export function batColor(b) { return b >= 85 ? '#82b39d' : b >= 80 ? '#74a8d6' : '#d98a76'; }
export function dnum(o) { return o.y * 10000 + o.m * 100 + o.d; }
export function dim(y, m) { return new Date(y, m, 0).getDate(); }
export function firstW(y, m) { return (new Date(y, m - 1, 1).getDay() + 6) % 7; }
export function weekdayOf(y, m, d) { return (firstW(y, m) + d - 1) % 7; }
export function mesesRest(gv) {
  let mo = (gv.y - TODAY.y) * 12 + (gv.m - TODAY.m);
  if (gv.d < TODAY.d) mo -= 1;
  return mo;
}
export function gvFmt(gv) { return gv.d + ' ' + MONTH_ABBR[gv.m - 1] + ' ' + gv.y; }
export function saldoDe(c) { return c.plan ? (c.plan.total - c.plan.pagadas) * c.plan.monto : 0; }
export function nextId(arr) { return String(arr.length + 1 + Date.now()).slice(-8); }
