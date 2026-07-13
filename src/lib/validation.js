// ─── IMEI ────────────────────────────────────────────────────────────────────

function luhn(imei) {
  let sum = 0;
  for (let i = 0; i < imei.length; i++) {
    let d = Number(imei[i]);
    if ((imei.length - i) % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

export function validateIMEI(raw, required = false) {
  const v = (raw || '').replace(/[\s\-]/g, '');
  if (!v) return required ? 'El IMEI es obligatorio.' : null;
  if (!/^\d+$/.test(v))   return 'El IMEI solo debe contener dígitos.';
  if (v.length !== 15)    return `El IMEI debe tener 15 dígitos (ingresaste ${v.length}).`;
  if (!luhn(v))           return 'El IMEI no es válido (dígito de control incorrecto).';
  return null;
}

export function isIMEIDuplicate(imei, equipos, excludeId = null) {
  const v = (imei || '').replace(/[\s\-]/g, '');
  if (!v || v.length !== 15) return false;
  return equipos.some(e => e.id !== excludeId && (e.imei || '').replace(/[\s\-]/g, '') === v);
}

// ─── PRECIOS ─────────────────────────────────────────────────────────────────

export function validatePrecio(usd) {
  const n = parseFloat(usd);
  if (!usd && usd !== 0) return 'El precio de venta es obligatorio.';
  if (isNaN(n) || n <= 0) return 'El precio de venta debe ser mayor a 0.';
  return null;
}

export function validateCosto(costo, usd) {
  if (costo === '' || costo == null) return null; // opcional
  const c = parseFloat(costo);
  const u = parseFloat(usd);
  if (isNaN(c) || c < 0)  return 'El costo no puede ser negativo.';
  if (!isNaN(u) && c > u) return 'El costo no puede ser mayor al precio de venta.';
  return null;
}

// ─── BATERÍA ─────────────────────────────────────────────────────────────────

export function validateBat(bat) {
  if (bat === '' || bat == null) return null; // opcional
  const n = parseInt(bat, 10);
  if (isNaN(n) || n < 1 || n > 100) return 'La batería debe estar entre 1 y 100.';
  return null;
}

// ─── CANTIDAD ────────────────────────────────────────────────────────────────

export function validateCantidad(cantidad) {
  const n = parseInt(cantidad, 10);
  if (isNaN(n) || n < 1) return 'La cantidad debe ser al menos 1.';
  return null;
}

// ─── CLIENTE ─────────────────────────────────────────────────────────────────

export function validateDNI(dni) {
  if (!dni || !String(dni).trim()) return null; // opcional
  const v = String(dni).replace(/[\s\.]/g, '');
  if (!/^\d{7,8}$/.test(v)) return 'El DNI debe tener 7 u 8 dígitos.';
  return null;
}

export function isDNIDuplicate(dni, clientes, excludeId = null) {
  if (!dni || !String(dni).trim()) return false;
  const v = String(dni).replace(/[\s\.]/g, '');
  if (!v) return false;
  return clientes.some(c => c.id !== excludeId && (c.dni || '').replace(/[\s\.]/g, '') === v);
}

export function validateTel(tel) {
  if (!tel || !String(tel).trim()) return null; // opcional
  const v = String(tel).replace(/[\s\-\(\)\+]/g, '');
  if (!/^\d{8,15}$/.test(v)) return 'El teléfono parece inválido (debe tener entre 8 y 15 dígitos).';
  return null;
}

// ─── PAGO ────────────────────────────────────────────────────────────────────

export function validateSenia(senia, precioUSD) {
  const s = parseFloat(senia) || 0;
  if (s < 0) return 'La seña no puede ser negativa.';
  if (s >= precioUSD) return 'La seña no puede ser mayor o igual al precio total (quedaría saldo 0).';
  return null;
}

export function validateAnticipo(anticipo, precioUSD) {
  const a = parseFloat(anticipo) || 0;
  if (a < 0) return 'El anticipo no puede ser negativo.';
  if (a >= precioUSD) return 'El anticipo no puede cubrir el total (usá Contado en su lugar).';
  return null;
}

export function validateCanjeValor(valor, precioUSD) {
  const v = parseFloat(valor) || 0;
  if (v < 0) return 'El valor del canje no puede ser negativo.';
  if (v >= precioUSD) return 'El canje no puede cubrir el precio completo.';
  return null;
}

export function validateCuotas(n) {
  const v = parseInt(n, 10);
  if (isNaN(v) || v < 2) return 'El plan de cuotas debe tener al menos 2 cuotas.';
  if (v > 60)            return 'El máximo de cuotas es 60.';
  return null;
}
