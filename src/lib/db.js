import { supabase } from './supabase.js';
import { MONTH_ABBR } from './utils.js';

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
  // garantia_vence: columna explícita; si no hay y no es "sin garantía",
  // fallback legacy de 3 meses desde la fecha de venta
  let garantiaVence = r.garantia_vence ? r.garantia_vence.slice(0, 10) : null;
  if (!garantiaVence && !r.sin_garantia && r.fecha) {
    const [y, m, d] = r.fecha.slice(0, 10).split('-').map(Number);
    const date = new Date(y, m - 1 + 3, d);
    garantiaVence = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  return {
    id: r.id,
    fechaLabel: isoToLabel(r.fecha),
    fechaNum: isoToNum(r.fecha),
    equipo: r.equipo_label,
    imei: r.imei || '',
    categoria: r.categoria || '',
    cliente: r.cliente_nombre,
    clienteId: r.cliente_id || null,
    usd: Number(r.usd),
    costo: r.costo ? Number(r.costo) : null,
    tc: r.tc || 1400,
    modalidad: r.modalidad,
    cuotas: r.cuotas ?? null,
    anticipo: r.anticipo ?? null,
    metodo: normMetodo(r.metodo),
    cuotaMonto: r.cuota_monto ?? null,
    canje: r.canje || false,
    canjeEquipo: r.canje_equipo || null,
    canjeValor: r.canje_valor ?? null,
    garantiaUrl: r.garantia_url || null,
    garantiaNombre: r.garantia_nombre || null,
    garantiaVence,
    sinGarantia: r.sin_garantia || false,
    lineas: r.lineas || null,
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

function ventaToRow(v) {
  const hoy = localDateISO();
  // Garantía: fecha explícita, "sin garantía", o default de 3 meses
  const garantiaVence = v.sinGarantia ? null : (v.garantiaVence || addMonthsISO(hoy, 3));
  return {
    fecha: hoy,
    garantia_vence: garantiaVence,
    sin_garantia: v.sinGarantia || false,
    equipo_label: v.equipo,
    imei: v.imei || null,
    categoria: v.categoria || null,
    cliente_nombre: v.cliente,
    cliente_id: v.clienteId || null,
    usd: v.usd,
    costo: v.costo ?? null,
    tc: v.tc ?? 1400,
    modalidad: v.modalidad,
    cuotas: v.cuotas ?? null,
    anticipo: v.anticipo ?? null,
    metodo: v.metodo || null,
    cuota_monto: v.cuotaMonto ?? null,
    canje: v.canje || false,
    canje_equipo: v.canjeEquipo || null,
    canje_valor: v.canjeValor ?? null,
    garantia_url: v.garantiaUrl || null,
    garantia_nombre: v.garantiaNombre || null,
    lineas: v.lineas || null,
    vendedor_numero: v.vendedorNumero ?? null,
  };
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
    .select('*')
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data.map(rowToVenta);
}

export async function createVenta(v) {
  const row = ventaToRow(v);
  let { data, error } = await supabase.from('ventas').insert(row).select().single();
  if (error && /garantia_vence|sin_garantia/.test(error.message || '')) {
    // Esquema sin migracion-garantia.sql (ej. deploy antes de correr el SQL):
    // reintentar sin las columnas nuevas para no bloquear las ventas
    const { garantia_vence, sin_garantia, ...rowViejo } = row;
    ({ data, error } = await supabase.from('ventas').insert(rowViejo).select().single());
  }
  if (error) throw error;
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

export async function deleteVenta(id) {
  // Si falla el borrado de los hijos, NO borrar la venta: evita cobros y
  // comisiones huérfanos que inflarían la agenda y la cuenta corriente
  const { error: eCobros } = await supabase.from('cobros').delete().eq('venta_id', id);
  if (eCobros) throw eCobros;
  const { error: eCom } = await supabase.from('comisiones').delete().eq('venta_id', id);
  // Tolerar solo que la tabla comisiones aún no exista (esquema sin migrar)
  if (eCom && !/schema cache|does not exist/i.test(eCom.message || '')) throw eCom;
  const { error } = await supabase.from('ventas').delete().eq('id', id);
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

export async function generateCobros(ventaId, ventaData) {
  if (!ventaData.cuotas) return [];
  if (!ventaData.cuotaMonto || ventaData.cuotaMonto < 1) {
    // Nunca dejar una venta financiada sin cuotas en silencio
    throw new Error('el monto por cuota es menor a US$ 1 — revisá el plan de pago');
  }
  const today = localDateISO();
  const { primeraCuotaHoy, cuotas, cuotaMonto } = ventaData;

  // La última cuota ajusta el redondeo para que la suma dé exacto el total financiado
  const totalFinanciado = Math.max(0,
    Number(ventaData.usd || 0)
    - Number(ventaData.anticipo || 0)
    - (ventaData.canje && ventaData.canjeValor ? Number(ventaData.canjeValor) : 0)
  );
  const ajusteUltima = Math.round((totalFinanciado - cuotaMonto * (cuotas - 1)) * 100) / 100;
  const montoUltima = totalFinanciado > 0 ? Math.max(0, ajusteUltima) : cuotaMonto;

  const makeRow = (i) => {
    const esHoy = primeraCuotaHoy && i === 0;
    return {
      venta_id: ventaId,
      cliente_id: ventaData.clienteId ?? null,
      cliente_nombre: ventaData.cliente,
      equipo_label: ventaData.equipo,
      monto: i === cuotas - 1 ? montoUltima : cuotaMonto,
      fecha: esHoy ? today : addMonthsISO(today, primeraCuotaHoy ? i : i + 1),
      estado: esHoy ? 'cobrada' : 'pendiente',
    };
  };

  const rows = Array.from({ length: ventaData.cuotas }, (_, i) => ({
    ...makeRow(i),
    numero_cuota: i + 1,
    total_cuotas: ventaData.cuotas,
  }));

  let { error } = await supabase.from('cobros').insert(rows);
  if (error?.message?.includes('numero_cuota') || error?.message?.includes('total_cuotas')) {
    // columnas opcionales aún no migradas — insertar sin ellas
    const rowsBase = Array.from({ length: ventaData.cuotas }, (_, i) => makeRow(i));
    ({ error } = await supabase.from('cobros').insert(rowsBase));
  }
  if (error) throw error;
  return [];
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
    fechaNum: isoToNum(c.fecha),
    fechaLabel: isoToLabel(c.fecha),
  }));
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
