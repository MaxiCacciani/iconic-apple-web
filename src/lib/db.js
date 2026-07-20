import { supabase } from './supabase.js';
import { MONTH_ABBR } from './utils.js';
import { getCatDef } from '../data/data.js';

// Un "equipo" es teléfono/consola (categoría con tab propia); los accesorios no.
const esPhone = (cat) => getCatDef(cat).enTabPropia;

// ─── Helpers de fecha ────────────────────────────────────────────────────────

export function isoToLabel(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH_ABBR[m - 1]} ${y}`;
}

export function isoToNum(iso) {
  if (!iso) return 0;
  const [y, m, d] = iso.split('-').map(Number);
  return y * 10000 + m * 100 + d;
}

function localDateISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addMonthsISO(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1 + n, d);
  if (date.getDate() !== d) date.setDate(0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ─── Mapeo BD → app ──────────────────────────────────────────────────────────

function rowToEquipo(r) {
  return {
    id: r.id,
    categoria: r.categoria,
    modelo: r.modelo,
    cap: r.cap || '',
    color: r.color || '',
    cond: r.cond,
    bat: r.bat ?? null,
    imei: r.imei || '',
    usd: r.usd,
    estado: r.estado,
    cantidad: r.cantidad ?? 1,
    defectos: r.defectos || '',
    costo: r.costo ?? null,
    proveedor: r.proveedor || '',
    negocioId: r.negocio_id || null,
  };
}

const METODO_NORM = {
  'transferencia': 'Transferencia',
  'efectivo':      'Efectivo',
  'debito':        'Débito',
  'débito':        'Débito',
  'credito':       'Crédito',
  'crédito':       'Crédito',
  'tarjeta':       'Crédito',
};
const normMetodo = (m) => {
  if (!m) return '';
  return METODO_NORM[m.toLowerCase()] ?? m;
};

function rowToVenta(r) {
  const items = Array.isArray(r.venta_items) ? r.venta_items : [];
  const lineas = items.map(it => ({
    equipoId: it.equipo_id || null,
    equipo: it.equipo_label,
    imei: it.imei || '',
    categoria: it.categoria || '',
    usd: Number(it.precio_usd),
    costo: it.costo != null ? Number(it.costo) : null,
    cantidad: it.cantidad || 1,
    esRegalo: !!it.es_regalo,
    comision: Number(it.comision || 0),
    negocioDuenio: it.negocio_duenio || null,
    garantiaVence: it.garantia_vence ? it.garantia_vence.slice(0, 10) : null,
    sinGarantia: !!it.sin_garantia,
  }));
  // Garantía a nivel venta para vistas de cabecera: el vencimiento más lejano
  // de los equipos con garantía; sin garantía si ningún equipo la tiene.
  const conGarantia = lineas.filter(l => !l.sinGarantia && l.garantiaVence);
  const garantiaVence = conGarantia.length
    ? conGarantia.map(l => l.garantiaVence).sort().slice(-1)[0]
    : null;
  return {
    id: r.id,
    fechaLabel: isoToLabel(r.fecha),
    fechaNum: isoToNum(r.fecha),
    equipo: lineas[0]?.equipo || r.equipo_label || 'Equipo',
    imei: lineas[0]?.imei || '',
    categoria: lineas[0]?.categoria || '',
    cliente: r.cliente_nombre,
    clienteId: r.cliente_id || null,
    usd: r.total_usd != null ? Number(r.total_usd) : Number(r.usd || 0),
    costo: r.total_costo != null ? Number(r.total_costo) : (r.costo ? Number(r.costo) : null),
    tc: r.tc || 1400,
    modalidad: r.modalidad,
    cuotas: r.cuotas ?? null,
    anticipo: r.anticipo ?? null,
    metodo: normMetodo(r.metodo),
    cuotaMonto: r.cuota_monto ?? null,
    canje: r.canje || false,
    canjeEquipo: r.canje_equipo_id || null,
    canjeValor: r.canje_valor ?? null,
    garantiaUrl: r.garantia_url || null,
    garantiaNombre: r.garantia_nombre || null,
    garantiaVence,
    sinGarantia: conGarantia.length === 0,
    lineas,
    vendedorNumero: r.vendedor_numero ?? null,
  };
}

function rowToReclamo(r) {
  return {
    id: r.id,
    equipoLabel: r.equipo_label || '',
    imei: r.imei || '',
    diagnostico: r.diagnostico || '',
    descripcion: r.descripcion || '',
    fecha: r.fecha || '',
    estado: r.estado || 'En gestión',
    resolucion: r.resolucion || '',
  };
}

function rowToCliente(r) {
  return {
    id: r.id,
    nombre: r.nombre,
    inicial: r.nombre.trim()[0].toUpperCase(),
    dni: r.dni || '',
    tel: r.tel || '',
    loc: r.loc || '',
    desde: r.desde || '',
    compras: [],
    plan: null,
    reclamos: (r.reclamos || []).map(rowToReclamo),
  };
}

function rowToReserva(r) {
  return {
    id: r.id,
    equipoId: r.equipo_id || null,
    equipo: r.equipo_label,
    spec: r.spec || '',
    cliente: r.cliente_nombre,
    clienteId: r.cliente_id || null,
    sena: r.sena || 0,
    usd: Number(r.usd),
    estado: r.estado,
    fecha: r.fecha_label || '',
  };
}

function rowToCobro(r) {
  const [y, m, d] = r.fecha.slice(0, 10).split('-').map(Number);
  const todayISO = localDateISO();
  const [ty, tm, td] = todayISO.split('-').map(Number);
  const cobroNum = y * 10000 + m * 100 + d;
  const todayNum = ty * 10000 + tm * 100 + td;
  // Si el cobro está pendiente y su fecha ya pasó, se trata como vencido
  const estado = r.estado === 'pendiente' && cobroNum < todayNum ? 'vencida' : r.estado;
  return {
    id: r.id,
    ventaId: r.venta_id,
    cliente: r.cliente_nombre,
    equipo: r.equipo_label + (r.numero_cuota ? ` · cuota ${r.numero_cuota}/${r.total_cuotas}` : ''),
    monto: r.monto,
    y, m, d,
    numeroCuota: r.numero_cuota,
    totalCuotas: r.total_cuotas,
    estado,
  };
}

// ─── Mapeo app → BD ──────────────────────────────────────────────────────────

function equipoToRow(e) {
  return {
    categoria: e.categoria,
    modelo: e.modelo,
    cap: e.cap || null,
    color: e.color || null,
    cond: e.cond,
    bat: e.bat ?? null,
    imei: e.imei || null,
    usd: e.usd,
    estado: e.estado || 'disponible',
    cantidad: e.cantidad ?? 1,
    defectos: e.defectos || null,
    costo: e.costo ?? null,
    proveedor: e.proveedor || null,
  };
}

// Filas de cobros (sin venta_id — lo completa la función Postgres crear_venta)
export function buildCobrosRows(v) {
  if (v.modalidad !== 'cuotas' || !v.cuotas) return [];
  if (!v.cuotaMonto || v.cuotaMonto < 1) {
    throw new Error('el monto por cuota es menor a US$ 1 — revisá el plan de pago');
  }
  const today = localDateISO();
  const { primeraCuotaHoy, cuotas, cuotaMonto } = v;
  const totalFinanciado = Math.max(0,
    Number(v.usd || 0) - Number(v.anticipo || 0)
    - (v.canje && v.canjeValor ? Number(v.canjeValor) : 0));
  const ajusteUltima = Math.round((totalFinanciado - cuotaMonto * (cuotas - 1)) * 100) / 100;
  const montoUltima = totalFinanciado > 0 ? Math.max(0, ajusteUltima) : cuotaMonto;
  return Array.from({ length: cuotas }, (_, i) => {
    const esHoy = primeraCuotaHoy && i === 0;
    return {
      cliente_id: v.clienteId ?? null,
      cliente_nombre: v.cliente,
      equipo_label: v.equipo,
      monto: i === cuotas - 1 ? montoUltima : cuotaMonto,
      fecha: esHoy ? today : addMonthsISO(today, primeraCuotaHoy ? i : i + 1),
      estado: esHoy ? 'cobrada' : 'pendiente',
      numero_cuota: i + 1,
      total_cuotas: cuotas,
    };
  });
}

// Filas de comisiones para equipos ajenos (sin venta_id)
export function buildComisionesRows(v, miNegocioId) {
  if (!miNegocioId) return [];
  const rows = [];
  for (const l of (v.lineas || [])) {
    if (!l.equipoId) continue;
    const duenio = l.negocioDuenio || null;
    if (!duenio || duenio === miNegocioId) continue;
    const capital = Math.round((l.costo || 0) * (l.cantidad || 1) * 100) / 100;
    const comision = l.comision || 0;
    if (capital > 0 || comision > 0) {
      rows.push({
        equipo_label: l.equipo || v.equipo || 'Equipo',
        monto: comision, capital, porcentaje: 0,
        negocio_duenio: duenio, negocio_vendedor: miNegocioId,
        fecha: localDateISO(),
      });
    }
  }
  return rows;
}

// Estado final del stock por equipo (valores absolutos)
export function buildStockUpdates(v, equipos) {
  const qtyPorEquipo = new Map();
  for (const l of (v.lineas || [])) {
    if (!l.equipoId) continue;
    qtyPorEquipo.set(l.equipoId, (qtyPorEquipo.get(l.equipoId) || 0) + (l.cantidad || 1));
  }
  const updates = [];
  for (const [eid, qty] of qtyPorEquipo) {
    const eq = equipos.find(e => e.id === eid);
    if (!eq) continue;
    if (!esPhone(eq.categoria) && eq.cantidad > qty) {
      updates.push({ equipo_id: eid, estado: 'disponible', cantidad: eq.cantidad - qty });
    } else {
      updates.push({ equipo_id: eid, estado: 'vendido', cantidad: eq.cantidad });
    }
  }
  return updates;
}

// Stock a restaurar al borrar una venta (valores absolutos)
export function buildStockRestores(venta, equipos) {
  const qtyPorEquipo = new Map();
  for (const l of (venta.lineas || [])) {
    if (!l.equipoId) continue;
    qtyPorEquipo.set(l.equipoId, (qtyPorEquipo.get(l.equipoId) || 0) + (l.cantidad || 1));
  }
  const restores = [];
  for (const [eid, qty] of qtyPorEquipo) {
    const eq = equipos.find(e => e.id === eid);
    if (!eq) continue;
    if (esPhone(eq.categoria)) {
      restores.push({ equipo_id: eid, estado: 'disponible', cantidad: eq.cantidad });
    } else {
      restores.push({ equipo_id: eid, estado: 'disponible', cantidad: eq.cantidad + qty });
    }
  }
  return restores;
}

// ─── EQUIPOS ─────────────────────────────────────────────────────────────────

export async function fetchEquipos() {
  const { data, error } = await supabase
    .from('equipos')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(rowToEquipo);
}

export async function createEquipo(item) {
  const { data, error } = await supabase
    .from('equipos')
    .insert(equipoToRow(item))
    .select()
    .single();
  if (error) throw error;
  return rowToEquipo(data);
}

export async function updateEquipo(id, updates) {
  const { data, error } = await supabase
    .from('equipos')
    .update(equipoToRow(updates))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return rowToEquipo(data);
}

// ─── CLIENTES ─────────────────────────────────────────────────────────────────

export async function fetchClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*, reclamos(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(rowToCliente);
}

export async function createCliente(item) {
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nombre: item.nombre,
      dni: item.dni || null,
      tel: item.tel || null,
      loc: item.loc || null,
      desde: item.desde || null,
    })
    .select('*, reclamos(*)')
    .single();
  if (error) throw error;
  return rowToCliente(data);
}

// ─── RECLAMOS ─────────────────────────────────────────────────────────────────

export async function createReclamo(clienteId, reclamo) {
  const { data, error } = await supabase
    .from('reclamos')
    .insert({
      cliente_id: clienteId,
      equipo_label: reclamo.equipoLabel || null,
      imei: reclamo.imei || null,
      diagnostico: reclamo.diagnostico || null,
      descripcion: reclamo.descripcion || null,
      fecha: reclamo.fecha || null,
      estado: reclamo.estado || 'En gestión',
      resolucion: reclamo.resolucion || null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToReclamo(data);
}

export async function updateReclamo(reclamoId, updates) {
  const row = {};
  if (updates.estado !== undefined)      row.estado = updates.estado;
  if (updates.resolucion !== undefined)  row.resolucion = updates.resolucion;
  if (updates.descripcion !== undefined) row.descripcion = updates.descripcion;
  const { error } = await supabase.from('reclamos').update(row).eq('id', reclamoId);
  if (error) throw error;
}

// ─── VENTAS ─────────────────────────────────────────────────────────────────

export async function fetchVentas() {
  const { data, error } = await supabase
    .from('ventas')
    .select('*, venta_items(*)')
    .order('fecha', { ascending: false });
  if (error) {
    // Esquema sin migrar (deploy antes del SQL): degradar sin romper la carga
    if (/venta_items|schema cache|does not exist/i.test(error.message || '')) return [];
    throw error;
  }
  return data.map(rowToVenta);
}

export async function createVenta(v, equipos = [], miNegocioId = null) {
  const items = (v.lineas || []).map(l => ({
    equipo_id: l.equipoId || null,
    cantidad: l.cantidad || 1,
    precio_usd: l.usd || 0,
    costo: l.costo ?? null,
    es_regalo: !!l.esRegalo,
    comision: l.comision || 0,
    negocio_duenio: l.negocioDuenio || null,
    equipo_label: l.equipo || v.equipo || 'Equipo',
    imei: l.imei || null,
    categoria: l.categoria || null,
    garantia_vence: l.garantiaVence || null,
    sin_garantia: l.sinGarantia ?? true,
  }));
  const totalUsd = items.reduce((a, it) => a + (it.es_regalo ? 0 : it.precio_usd * it.cantidad), 0);
  const totalCosto = items.reduce((a, it) => a + (it.costo != null ? it.costo * it.cantidad : 0), 0);
  const payload = {
    venta: {
      cliente_id: v.clienteId || null,
      cliente_nombre: v.cliente,
      fecha: localDateISO(),
      tc: v.tc ?? 1400,
      modalidad: v.modalidad,
      cuotas: v.cuotas ?? null,
      anticipo: v.anticipo ?? null,
      cuota_monto: v.cuotaMonto ?? null,
      metodo: v.metodo || null,
      canje: v.canje || false,
      canje_valor: v.canjeValor ?? null,
      garantia_url: v.garantiaUrl || null,
      garantia_nombre: v.garantiaNombre || null,
      total_usd: Math.round(totalUsd * 100) / 100,
      total_costo: Math.round(totalCosto * 100) / 100,
      vendedor_numero: v.vendedorNumero ?? null,
    },
    items,
    cobros: buildCobrosRows(v),
    comisiones: buildComisionesRows(v, miNegocioId),
    stock_updates: buildStockUpdates(v, equipos),
    canje_equipo: v.canjeEquipoData || null,
  };
  const { data: newId, error } = await supabase.rpc('crear_venta', { payload });
  if (error) throw error;
  const { data, error: e2 } = await supabase
    .from('ventas').select('*, venta_items(*)').eq('id', newId).single();
  if (e2) throw e2;
  return rowToVenta(data);
}

export async function updateVenta(id, updates) {
  const row = {};
  if (updates.garantiaUrl !== undefined)    row.garantia_url = updates.garantiaUrl;
  if (updates.garantiaNombre !== undefined) row.garantia_nombre = updates.garantiaNombre;
  if (updates.costo !== undefined)          row.costo = updates.costo;
  const { error } = await supabase.from('ventas').update(row).eq('id', id);
  if (error) throw error;
}

// ─── RESERVAS ────────────────────────────────────────────────────────────────

export async function fetchReservas() {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(rowToReserva);
}

export async function createReserva(item) {
  const { data, error } = await supabase
    .from('reservas')
    .insert({
      equipo_label: item.equipo,
      spec: item.spec || null,
      cliente_nombre: item.cliente,
      cliente_id: item.clienteId || null,
      sena: item.sena || 0,
      usd: item.usd,
      estado: 'activa',
      equipo_id: item.equipoId || null,
      fecha_label: isoToLabel(localDateISO()),
    })
    .select()
    .single();
  if (error) throw error;
  return rowToReserva(data);
}

export async function updateReservaEstado(id, estado) {
  const { error } = await supabase.from('reservas').update({ estado }).eq('id', id);
  if (error) throw error;
}

export async function deleteVenta(id, stockRestores = []) {
  // Borrado atómico: restaura stock y borra cobros/comisiones/venta en una
  // transacción (los venta_items caen por CASCADE)
  const { error } = await supabase.rpc('borrar_venta', { p_venta_id: id, p_stock_restores: stockRestores });
  if (error) throw error;
}

export async function deleteEquipo(id) {
  const { error } = await supabase.from('equipos').delete().eq('id', id);
  if (error) throw error;
}

export async function updateCliente(id, updates) {
  const { data, error } = await supabase
    .from('clientes')
    .update({
      nombre: updates.nombre,
      dni:    updates.dni  || null,
      tel:    updates.tel  || null,
      loc:    updates.loc  || null,
    })
    .eq('id', id)
    .select('*, reclamos(*)')
    .single();
  if (error) throw error;
  return rowToCliente(data);
}

export async function deleteCliente(id) {
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteReserva(id) {
  const { error } = await supabase.from('reservas').delete().eq('id', id);
  if (error) throw error;
}

// ─── COBROS ──────────────────────────────────────────────────────────────────

export async function fetchCobros() {
  const { data, error } = await supabase
    .from('cobros')
    .select('*')
    .order('fecha', { ascending: true });
  if (error) throw error;
  return data.map(rowToCobro);
}

export async function updateCobroEstado(id, estado) {
  const { error } = await supabase.from('cobros').update({ estado }).eq('id', id);
  if (error) throw error;
}

// ─── NEGOCIOS Y COMISIONES ───────────────────────────────────────────────────

export async function fetchNegocios() {
  const { data, error } = await supabase.from('negocios').select('id, nombre');
  if (error) throw error;
  return data.map(n => ({ id: n.id, nombre: n.nombre }));
}

export async function createComisiones(rows) {
  if (!rows.length) return;
  const { error } = await supabase.from('comisiones').insert(rows.map(c => ({
    venta_id: c.ventaId || null,
    fecha: localDateISO(),  // fecha local del negocio, no current_date en UTC
    equipo_label: c.equipo,
    monto: c.monto,
    capital: c.capital || 0,
    porcentaje: c.porcentaje || 0,
    negocio_duenio: c.negocioDuenio,
    negocio_vendedor: c.negocioVendedor,
  })));
  if (error) throw error;
}

export async function fetchComisiones() {
  const { data, error } = await supabase
    .from('comisiones')
    .select('*')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(c => ({
    id: c.id,
    ventaId: c.venta_id,
    equipo: c.equipo_label,
    monto: Number(c.monto),
    capital: Number(c.capital || 0),
    porcentaje: Number(c.porcentaje || 0),
    negocioDuenio: c.negocio_duenio,
    negocioVendedor: c.negocio_vendedor,
    pagado: !!c.pagado,
    pagadoEn: c.pagado_en || null,
    fechaNum: isoToNum(c.fecha),
    fechaLabel: isoToLabel(c.fecha),
  }));
}

export async function setComisionPagada(id, pagado) {
  const { error } = await supabase.from('comisiones')
    .update({ pagado, pagado_en: pagado ? localDateISO() : null })
    .eq('id', id);
  if (error) throw error;
}

// ─── MOVIMIENTOS (cuenta corriente manual entre socios) ──────────────────────

const rowToMovimiento = (m) => ({
  id: m.id,
  concepto: m.concepto,
  monto: Number(m.monto),
  negocioDeudor: m.negocio_deudor,
  negocioAcreedor: m.negocio_acreedor,
  creadoPor: m.creado_por,
  pagado: !!m.pagado,
  pagadoEn: m.pagado_en || null,
  fechaNum: isoToNum(m.fecha),
  fechaLabel: isoToLabel(m.fecha),
});

export async function fetchMovimientos() {
  const { data, error } = await supabase
    .from('movimientos')
    .select('*')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    // Tolerar que la tabla aún no exista (deploy antes que la migración)
    if (/schema cache|does not exist/i.test(error.message || '')) return [];
    throw error;
  }
  return data.map(rowToMovimiento);
}

export async function createMovimiento(mov) {
  const { data, error } = await supabase.from('movimientos').insert({
    fecha: mov.fecha || localDateISO(),
    concepto: mov.concepto,
    monto: mov.monto,
    negocio_deudor: mov.negocioDeudor,
    negocio_acreedor: mov.negocioAcreedor,
    // creado_por lo pone la BD con default negocio_actual()
  }).select().single();
  if (error) throw error;
  return rowToMovimiento(data);
}

export async function setMovimientoPagado(id, pagado) {
  const { error } = await supabase.from('movimientos')
    .update({ pagado, pagado_en: pagado ? localDateISO() : null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMovimiento(id) {
  const { error } = await supabase.from('movimientos').delete().eq('id', id);
  if (error) throw error;
}

// ─── VENDEDORES ──────────────────────────────────────────────────────────────

export async function fetchVendedores() {
  const { data, error } = await supabase
    .from('vendedores')
    .select('numero, nombre')
    .order('numero', { ascending: true });
  if (error) throw error;
  return data;
}

export async function saveVendedor(v) {
  // negocio_id explícito desde el JWT: la tabla es nueva y el default
  // puede no estar aplicado según la versión de la migración
  const { data: { session } } = await supabase.auth.getSession();
  const negocioId = session?.user?.app_metadata?.negocio_id || null;
  const { error } = await supabase
    .from('vendedores')
    .upsert({ negocio_id: negocioId, numero: v.numero, nombre: v.nombre }, { onConflict: 'negocio_id,numero' });
  if (error) throw error;
}

// ─── STORAGE ─────────────────────────────────────────────────────────────────

export async function uploadGarantia(ventaId, files) {
  const arr = Array.isArray(files) ? files : [files];
  const multi = arr.length > 1;
  const results = await Promise.all(arr.map(async (file, i) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const path = multi ? `${ventaId}_${i + 1}.${ext}` : `${ventaId}.${ext}`;
    const { error } = await supabase.storage
      .from('garantias')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from('garantias').getPublicUrl(path);
    return { url: data.publicUrl, nombre: file.name };
  }));
  return {
    url:    results.map(r => r.url).join('|'),
    nombre: results.map(r => r.nombre).join('|'),
  };
}

export async function deleteGarantia(garantiaUrl) {
  if (!garantiaUrl) return;
  const urls = garantiaUrl.split('|').filter(Boolean);
  const paths = urls.map(u => {
    const idx = u.indexOf('/garantias/');
    return idx >= 0 ? decodeURIComponent(u.slice(idx + '/garantias/'.length)) : null;
  }).filter(Boolean);
  if (paths.length > 0) await supabase.storage.from('garantias').remove(paths);
}
