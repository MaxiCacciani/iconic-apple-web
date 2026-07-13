import { useState, useEffect } from 'react';
import { getCatDef, esPhone, CATEGORIAS, getModelos, getCaps, getColores } from '../data/data.js';
import { fARS, fUSD, batColor } from '../lib/utils.js';
import Modal from '../components/Modal.jsx';
import BatBadge from '../components/BatBadge.jsx';
import EquipoPicker from '../components/EquipoPicker.jsx';
import { validateDNI, validateTel, validateSenia, validateAnticipo, validateCanjeValor, validateCuotas, validateIMEI, validateBat, isDNIDuplicate } from '../lib/validation.js';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });

// ─── Packs (localStorage) ────────────────────────────────────────────────────

const PACKS_KEY = 'iconic_packs';
function loadPacks() {
  try { return JSON.parse(localStorage.getItem(PACKS_KEY) || '[]'); }
  catch { return []; }
}
function savePacks(packs) {
  localStorage.setItem(PACKS_KEY, JSON.stringify(packs));
}


// ─── PackModal ───────────────────────────────────────────────────────────────

function PackModal({ pack, equipos, onSave, onClose }) {
  const isEdit = !!pack;
  const [nombre, setNombre] = useState(pack?.nombre || '');
  const [items, setItems] = useState(pack?.items || [{ categoria: CATEGORIAS[0], modelo: '', esRegalo: false }]);

  const addItem = () => setItems(p => [...p, { categoria: CATEGORIAS[0], modelo: '', esRegalo: false }]);
  const removeItem = (i) => setItems(p => p.filter((_, j) => j !== i));
  const updateItem = (i, key, val) => setItems(p => p.map((it, j) => j === i ? { ...it, [key]: val } : it));
  const canSave = nombre.trim().length > 0 && items.length > 0;

  const modelosDisp = (categoria) => [...new Set(
    (equipos || []).filter(e => e.estado === 'disponible' && e.categoria === categoria).map(e => e.modelo)
  )];

  const LB = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6a717b', display: 'block', marginBottom: 7 };
  const SEL = { width: '100%', padding: '10px 12px', borderRadius: 9, background: '#1e2228', border: '1px solid rgba(231,238,246,0.09)', color: '#eef2f7', fontSize: 13.5, appearance: 'none' };

  return (
    <Modal title={isEdit ? 'Editar pack' : 'Nuevo pack'} onClose={onClose} width={520}>
      <div style={{ marginBottom: 18 }}>
        <span style={LB}>Nombre del pack</span>
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="ej. iPhone + Accesorios de regalo" style={{ width: '100%', padding: '10px 12px', borderRadius: 9, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)', color: '#eef2f7', fontSize: 13.5, boxSizing: 'border-box' }} autoFocus />
      </div>
      <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', color: '#6a717b', marginBottom: 10 }}>Productos que incluye</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {items.map((item, i) => {
          const modelos = modelosDisp(item.categoria);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 8, alignItems: 'end', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(231,238,246,0.08)', background: 'rgba(231,238,246,0.02)' }}>
              <div>
                <span style={LB}>Categoría</span>
                <select value={item.categoria} onChange={e => { updateItem(i, 'categoria', e.target.value); updateItem(i, 'modelo', ''); }} style={SEL}>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <span style={LB}>Modelo en stock</span>
                <select value={item.modelo} onChange={e => updateItem(i, 'modelo', e.target.value)} style={SEL}>
                  <option value="">— Cualquier modelo —</option>
                  {modelos.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {modelos.length === 0 && <div style={{ fontSize: 11, color: '#d98a76', marginTop: 4 }}>Sin stock disponible en esta categoría</div>}
              </div>
              <button
                onClick={() => updateItem(i, 'esRegalo', !item.esRegalo)}
                style={{ padding: '9px 10px', borderRadius: 8, border: `1px solid ${item.esRegalo ? 'rgba(130,179,157,0.5)' : 'rgba(231,238,246,0.12)'}`, background: item.esRegalo ? 'rgba(130,179,157,0.12)' : 'rgba(231,238,246,0.03)', color: item.esRegalo ? '#82b39d' : '#828a94', fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {item.esRegalo ? '🎁 Regalo' : 'Con precio'}
              </button>
              <button onClick={() => removeItem(i)} style={{ padding: '9px 10px', background: 'none', border: '1px solid rgba(231,238,246,0.08)', borderRadius: 8, cursor: 'pointer', color: '#6a717b', fontSize: 15 }}>✕</button>
            </div>
          );
        })}
        <button onClick={addItem} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 9, border: '1px dashed rgba(116,168,214,0.3)', background: 'rgba(116,168,214,0.04)', color: '#74a8d6', fontSize: 13, cursor: 'pointer' }}>
          + Agregar producto al pack
        </button>
      </div>
      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.03)', border: '1px solid rgba(231,238,246,0.07)', marginBottom: 18, fontSize: 12.5, color: '#828a94', lineHeight: 1.5 }}>
        Al aplicar el pack, se busca el primer equipo disponible de cada categoría y se agrega al carrito. Los marcados "Regalo" se incluyen a precio $0.
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 11, border: '1px solid rgba(231,238,246,0.12)', background: 'none', color: '#a6afba', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={() => canSave && onSave({ id: pack?.id || `pack_${Date.now()}`, nombre: nombre.trim(), items })} style={{ flex: 2, padding: 12, borderRadius: 11, border: '1px solid rgba(255,255,255,0.2)', background: canSave ? 'linear-gradient(160deg, #eef2f6, #b7c3ce)' : 'rgba(231,238,246,0.05)', color: canSave ? '#14171c' : '#6a717b', fontSize: 14, fontWeight: 600, cursor: canSave ? 'pointer' : 'default' }}>
          {isEdit ? 'Guardar cambios' : 'Crear pack'}
        </button>
      </div>
    </Modal>
  );
}


// ─── NuevoClienteModal ───────────────────────────────────────────────────────

function NuevoClienteModal({ nombre: nombreInit, clientes, onSave, onClose }) {
  const [nombre, setNombre] = useState(nombreInit || '');
  const [dni, setDni] = useState('');
  const [tel, setTel] = useState('');
  const [loc, setLoc] = useState('Villa Carlos Paz');

  const errDni = validateDNI(dni) || (dni && isDNIDuplicate(dni, clientes) ? 'Ya existe un cliente con ese DNI.' : null);
  const errTel = validateTel(tel);
  const canSave = nombre.trim().length > 1 && !errDni && !errTel;

  const field = (hasErr) => ({ width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.04)', border: `1px solid ${hasErr ? 'rgba(217,138,118,0.5)' : 'rgba(231,238,246,0.09)'}`, color: '#eef2f7', fontSize: 14 });
  const fw = { marginBottom: 14 };
  const ML = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7, color: '#6a717b', display: 'block' };
  const errStyle = { fontSize: 11.5, color: '#e6ab98', marginTop: 5 };

  return (
    <Modal title="Registrar nuevo cliente" onClose={onClose} width={460}>
      <div style={fw}><span style={ML}>Nombre completo *</span><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre Apellido" style={field(false)} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, ...fw }}>
        <div><span style={ML}>DNI</span><input value={dni} onChange={e => setDni(e.target.value)} placeholder="34521890" style={field(!!errDni)} />{errDni && <div style={errStyle}>{errDni}</div>}</div>
        <div><span style={ML}>Teléfono</span><input value={tel} onChange={e => setTel(e.target.value)} placeholder="+54 9 3541 …" style={field(!!errTel)} />{errTel && <div style={errStyle}>{errTel}</div>}</div>
      </div>
      <div style={fw}><span style={ML}>Localidad</span><input value={loc} onChange={e => setLoc(e.target.value)} placeholder="Villa Carlos Paz" style={field(false)} /></div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 11, border: '1px solid rgba(231,238,246,0.12)', background: 'none', color: '#a6afba', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={() => canSave && onSave({ nombre: nombre.trim(), dni, tel, loc, desde: '2026' })} style={{ flex: 2, padding: 12, borderRadius: 11, border: '1px solid rgba(255,255,255,0.2)', background: canSave ? 'linear-gradient(160deg, #eef2f6, #b7c3ce)' : 'rgba(231,238,246,0.05)', color: canSave ? '#14171c' : '#6a717b', fontSize: 14, fontWeight: 600, cursor: canSave ? 'pointer' : 'default' }}>
          Registrar y seleccionar
        </button>
      </div>
    </Modal>
  );
}

// ─── PrecioInput ─────────────────────────────────────────────────────────────

function PrecioInput({ item, onUpdate }) {
  const init = item.usdVenta !== null && item.usdVenta !== undefined ? item.usdVenta : item.usd;
  const [localVal, setLocalVal] = useState(String(init));
  const num = parseFloat(localVal);
  const efectivo = !isNaN(num) ? num : init;
  const bajoCosto = item.costo && efectivo < item.costo;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 10px', borderRadius: 7, background: 'rgba(231,238,246,0.04)', border: `1px solid ${bajoCosto ? 'rgba(217,138,118,0.5)' : 'rgba(231,238,246,0.1)'}` }}>
        <span style={{ fontSize: 11, color: '#6a717b' }}>US$</span>
        <input
          type="number" min="0" step="0.01"
          value={localVal}
          onChange={e => { setLocalVal(e.target.value); onUpdate(item.carritoId, e.target.value); }}
          onWheel={e => e.target.blur()}
          style={{ width: 64, background: 'none', border: 'none', color: '#eef2f7', fontSize: 13.5, fontWeight: 600, textAlign: 'right', padding: 0 }}
        />
      </div>
      {bajoCosto && <span style={{ fontSize: 10.5, color: '#d98a76' }}>⚠ bajo costo ({fUSD(item.costo)})</span>}
    </div>
  );
}

// ─── CanjeCombo ──────────────────────────────────────────────────────────────

const CANJE_SEL = { width: '100%', padding: '10px 14px', borderRadius: 10, background: '#1e2228', border: '1px solid rgba(231,238,246,0.09)', color: '#eef2f7', fontSize: 14, appearance: 'none', boxSizing: 'border-box', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236a717b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' };
const CANJE_IN = { width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)', color: '#eef2f7', fontSize: 14, boxSizing: 'border-box' };
const CANJE_LB = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7, color: '#6a717b', display: 'block' };

function CanjeCombo({ value, onChange, options, placeholder }) {
  const [otroMode, setOtroMode] = useState(false);
  useEffect(() => { setOtroMode(false); }, [options]);
  if (!options || options.length === 0)
    return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={CANJE_IN} />;
  const isCustom = value !== '' && !options.includes(value);
  const showInput = otroMode || isCustom;
  const sel = showInput ? '__otro__' : value;
  return (
    <>
      <select value={sel} onChange={e => { if (e.target.value === '__otro__') { setOtroMode(true); onChange(''); } else { setOtroMode(false); onChange(e.target.value); } }} style={CANJE_SEL}>
        <option value="">— Seleccionar —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__otro__">Otro…</option>
      </select>
      {showInput && <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...CANJE_IN, marginTop: 8 }} />}
    </>
  );
}

// ─── VendedorStep ────────────────────────────────────────────────────────────

function VendedorStep({ vendedorNumero, onChangeNumero }) {
  const vendedores = (() => {
    try { return JSON.parse(localStorage.getItem('iconic_vendedores') || '[]'); }
    catch { return []; }
  })();
  const num = parseInt(vendedorNumero, 10);
  const vendedor = vendedores.find(v => v.numero === num);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 13, border: '1px solid rgba(231,238,246,0.08)', background: 'rgba(231,238,246,0.02)' }}>
      <div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6a717b', marginBottom: 7 }}>Nº vendedor</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 9, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)', width: 90 }}>
          <input
            type="number" min="1" value={vendedorNumero}
            onChange={e => onChangeNumero(e.target.value)}
            onWheel={e => e.target.blur()}
            placeholder="—"
            style={{ width: '100%', background: 'none', border: 'none', color: '#eef2f7', fontSize: 15, fontWeight: 600, padding: 0, textAlign: 'center' }}
          />
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6a717b', marginBottom: 7 }}>Nombre</div>
        <div style={{ padding: '10px 0', fontSize: 14, color: vendedor ? '#eef2f7' : '#4a5058', fontStyle: vendedor ? 'normal' : 'italic' }}>
          {vendedor ? vendedor.nombre : vendedorNumero ? 'Vendedor no registrado' : 'Sin asignar'}
        </div>
      </div>
    </div>
  );
}

// ─── Venta (main) ────────────────────────────────────────────────────────────

export default function Venta({ equipos, clientes, tc, onConfirm, onConfirmApartado, onAddCliente }) {
  const [carrito, setCarrito] = useState([]);
  const [modalidad, setModalidad] = useState('contado');
  const [cuotas, setCuotas] = useState(6);
  const [cuotasCustom, setCuotasCustom] = useState(false);
  const [anticipo, setAnticipo] = useState('');
  const [primeraCuotaHoy, setPrimeraCuotaHoy] = useState(false);
  const [metodo, setMetodo] = useState('Transferencia');
  const [cliente, setCliente] = useState('');
  const [clienteId, setClienteId] = useState(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [nuevoClienteModal, setNuevoClienteModal] = useState(false);
  const [tieneApartado, setTieneApartado] = useState(false);
  const [seniaContado, setSeniaContado] = useState('');
  const [canje, setCanje] = useState(false);
  const [canjeCategoria, setCanjeCategoria] = useState('iPhone');
  const [canjeModelo, setCanjeModelo] = useState('');
  const [canjeCap, setCanjeCap] = useState('');
  const [canjeColor, setCanjeColor] = useState('');
  const [canjeCond, setCanjeCond] = useState('Usado');
  const [canjeImei, setCanjeImei] = useState('');
  const [canjeBat, setCanjeBat] = useState('');
  const [canjeControles, setCanjeControles] = useState('1');
  const [canjeExtras, setCanjeExtras] = useState('');
  const [canjeValor, setCanjeValor] = useState('');
  const [packs, setPacks] = useState(loadPacks);
  const [packModal, setPackModal] = useState(null);
  const [packMsg, setPackMsg] = useState('');
  const [vendedorNumero, setVendedorNumero] = useState(() => {

    try {
      const vs = JSON.parse(localStorage.getItem('iconic_vendedores') || '[]');
      return vs.length > 0 ? String(vs[vs.length - 1].numero) : '';
    } catch { return ''; }
  });

  const resetForm = () => {
    setCarrito([]);
    setModalidad('contado');
    setCuotas(6);
    setCuotasCustom(false);
    setAnticipo('');
    setPrimeraCuotaHoy(false);
    setMetodo('Transferencia');
    setCliente('');
    setClienteId(null);
    setClienteSearch('');
    setTieneApartado(false);
    setSeniaContado('');
    setCanje(false);
    setCanjeCategoria('iPhone');
    setCanjeModelo('');
    setCanjeCap('');
    setCanjeColor('');
    setCanjeCond('Usado');
    setCanjeImei('');
    setCanjeBat('');
    setCanjeControles('1');
    setCanjeExtras('');
    setCanjeValor('');
    setPackMsg('');
  };

  // ── Carrito helpers ──
  const addToCarrito = (eq) => {
    setCarrito(prev => {
      if (esPhone(eq.categoria)) {
        if (prev.some(c => c.id === eq.id)) return prev;
        return [...prev, { ...eq, carritoId: `${eq.id}_${Date.now()}`, cantidadVenta: 1, esRegalo: false }];
      }
      const totalQty = prev.filter(c => c.id === eq.id).reduce((s, c) => s + c.cantidadVenta, 0);
      if (totalQty >= eq.cantidad) return prev;
      // buscar slot sin regalo para incrementar; si todos son regalo → nuevo slot separado
      const nonRegaloSlot = prev.find(c => c.id === eq.id && !c.esRegalo);
      if (nonRegaloSlot) {
        return prev.map(c => c.carritoId === nonRegaloSlot.carritoId ? { ...c, cantidadVenta: c.cantidadVenta + 1 } : c);
      }
      return [...prev, { ...eq, carritoId: `${eq.id}_${Date.now()}`, cantidadVenta: 1, esRegalo: false }];
    });
  };
  const removeFromCarrito = (carritoId) => setCarrito(prev => prev.filter(c => c.carritoId !== carritoId));
  const removeAllFromCarrito = (equipoId) => setCarrito(prev => prev.filter(c => c.id !== equipoId));
  const decrementCarrito = (equipoId) => {
    setCarrito(prev => {
      const lastSlot = [...prev].reverse().find(c => c.id === equipoId);
      if (!lastSlot) return prev;
      if (lastSlot.cantidadVenta > 1) return prev.map(c => c.carritoId === lastSlot.carritoId ? { ...c, cantidadVenta: c.cantidadVenta - 1 } : c);
      return prev.filter(c => c.carritoId !== lastSlot.carritoId);
    });
  };
  const toggleRegalo = (carritoId) => {
    setCarrito(prev => prev.map(c => c.carritoId === carritoId ? { ...c, esRegalo: !c.esRegalo } : c));
  };
  const updatePrecio = (carritoId, val) => {
    const num = parseFloat(val);
    setCarrito(prev => prev.map(c => c.carritoId === carritoId ? { ...c, usdVenta: isNaN(num) || val === '' ? null : Math.max(0, num) } : c));
  };
  const effPrecio = (item) => item.usdVenta !== null && item.usdVenta !== undefined ? item.usdVenta : item.usd;

  const applyPack = (pack) => {
    const toAdd = [];
    const notFound = [];
    let idx = 0;
    for (const item of pack.items) {
      const isItemPhone = esPhone(item.categoria);
      const match = equipos.find(e => {
        if (e.estado !== 'disponible') return false;
        if (e.categoria !== item.categoria) return false;
        if (item.modelo && !e.modelo.toLowerCase().includes(item.modelo.toLowerCase())) return false;
        // Para teléfonos: no agregar si ya está en el carrito
        if (isItemPhone && carrito.some(c => c.id === e.id)) return false;
        // Para accesorios: verificar que no superamos el stock total
        if (!isItemPhone) {
          const yaEnCarrito = carrito.filter(c => c.id === e.id).reduce((s, c) => s + c.cantidadVenta, 0);
          const yaEnToAdd = toAdd.filter(a => a.id === e.id).reduce((s, a) => s + a.cantidadVenta, 0);
          if (yaEnCarrito + yaEnToAdd >= e.cantidad) return false;
        }
        // Evitar duplicar el mismo equipo dos veces dentro del mismo pack
        if (isItemPhone && toAdd.some(a => a.id === e.id)) return false;
        return true;
      });
      if (match) {
        toAdd.push({ ...match, carritoId: `${match.id}_pack_${Date.now()}_${idx++}`, cantidadVenta: 1, esRegalo: item.esRegalo });
      } else {
        notFound.push(item.categoria + (item.modelo ? ` ${item.modelo}` : ''));
      }
    }
    if (toAdd.length > 0) setCarrito(prev => [...prev, ...toAdd]);
    const msg = toAdd.length > 0
      ? `✓ ${toAdd.length} ítem${toAdd.length > 1 ? 's' : ''} agregado${toAdd.length > 1 ? 's' : ''}${notFound.length > 0 ? ` · sin stock: ${notFound.join(', ')}` : ''}`
      : `Sin coincidencias en stock (${notFound.join(', ')})`;
    setPackMsg(msg);
    setTimeout(() => setPackMsg(''), 5000);
  };

  const savePacksState = (newPacks) => { setPacks(newPacks); savePacks(newPacks); };
  const deletePack = (id) => savePacksState(packs.filter(p => p.id !== id));

  // ── Derivados ──
  const primerEq = carrito[0] || null;
  const totalUnidades = carrito.reduce((a, b) => a + (b.cantidadVenta || 1), 0);
  const vPrecioUSD = carrito.reduce((a, b) => a + (b.esRegalo ? 0 : effPrecio(b) * (b.cantidadVenta || 1)), 0);
  const vPrecioARS = vPrecioUSD * tc;
  const antNum = parseFloat(anticipo || '0') || 0;
  const seniaNum = parseFloat(seniaContado || '0') || 0;  // USD
  const canjeNum = parseFloat(canjeValor || '0') || 0;  // USD
  const esCuotas = modalidad === 'cuotas';
  const aFinanciar = Math.max(0, vPrecioUSD - antNum - (esCuotas ? canjeNum : 0));
  const cuotaMonto = esCuotas && cuotas ? Math.round(aFinanciar / cuotas) : 0;
  const saldoContadoUSD = Math.max(0, vPrecioUSD - seniaNum);
  const saldoTrasCanje = Math.max(0, vPrecioARS - canjeNum * tc);
  const canjeDef       = getCatDef(canjeCategoria);
  const canjeIsPhone   = canjeDef.tieneIMEI;
  const canjeIsConsola = canjeDef.tieneControles;
  const canjeControlesNum = parseInt(canjeControles) || 0;
  const canjeEquipoLabel = [
    canjeModelo, canjeCap, canjeColor,
    canjeIsConsola && canjeControlesNum > 0 ? `${canjeControlesNum} control${canjeControlesNum !== 1 ? 'es' : ''}` : null,
  ].filter(Boolean).join(' · ');
  const puedeApartado = carrito.length <= 1;
  const hayRegalos = carrito.some(c => c.esRegalo);

  const ventaErrors = (() => {
    const e = [];
    if (esCuotas) {
      const ec = validateCuotas(cuotas); if (ec) e.push(ec);
      const ea = validateAnticipo(anticipo, vPrecioUSD); if (ea) e.push(ea);
      if (canje && canjeNum > 0 && antNum + canjeNum >= vPrecioUSD)
        e.push('La suma de anticipo y canje cubre el total — usá Contado en su lugar.');
      if (!ec && aFinanciar > 0 && cuotaMonto < 1)
        e.push('El monto por cuota da menos de US$ 1 — reducí la cantidad de cuotas.');
    }
    if (!esCuotas && tieneApartado) { const es = validateSenia(seniaContado, vPrecioUSD); if (es) e.push(es); }
    if (canje) {
      const ev = validateCanjeValor(canjeValor, vPrecioUSD); if (ev) e.push(ev);
      if (canjeIsPhone && canjeModelo) {
        const ei = validateIMEI(canjeImei, false); if (ei) e.push(`IMEI canje: ${ei}`);
        else if (canjeImei && equipos.some(eq => eq.imei && eq.imei === canjeImei && eq.estado !== 'vendido')) {
          e.push('IMEI canje: ya existe en el stock con ese IMEI');
        }
        const eb = validateBat(canjeBat); if (eb) e.push(`Batería canje: ${eb}`);
      }
    }
    return e;
  })();

  const cq = clienteSearch.trim().toLowerCase();
  const clienteMatches = clientes.filter(c => !cq || (c.nombre + ' ' + c.dni).toLowerCase().includes(cq)).slice(0, 5);
  const canConfirm = carrito.length > 0 && !!cliente && ventaErrors.length === 0;

  const handleNuevoCliente = async (data) => {
    const nuevo = await onAddCliente(data);
    if (nuevo) { setCliente(nuevo.nombre); setClienteId(nuevo.id); }
    setClienteSearch('');
    setNuevoClienteModal(false);
  };

  const buildLineas = () => carrito.map(e => ({
    equipoId: e.id,
    equipo: [e.modelo, e.cap, e.color].filter(Boolean).join(' · '),
    imei: e.imei || '',
    categoria: e.categoria,
    usd: e.esRegalo ? 0 : effPrecio(e),
    costo: e.costo || null,
    cantidad: e.cantidadVenta || 1,
    esRegalo: e.esRegalo || false,
    garantiaUrl: e.garantiaUrl || null,
    garantiaNombre: e.garantiaNombre || null,
  }));

  const buildVentaData = () => {
    const lineas = buildLineas();
    const etiquetaEquipo = lineas.length === 1 ? lineas[0].equipo : `${lineas[0].equipo} + ${lineas.length - 1} más`;
    const costoTotal = carrito.reduce((a, b) => a + (b.costo || 0) * (b.cantidadVenta || 1), 0);
    return {
      clienteId, equipo: etiquetaEquipo, imei: primerEq?.imei || '',
      categoria: primerEq?.categoria || '', cliente, usd: vPrecioUSD,
      costo: costoTotal || null, tc, modalidad: esCuotas ? 'cuotas' : 'contado',
      cuotas: esCuotas ? cuotas : null, anticipo: esCuotas ? antNum : null, metodo,
      cuotaMonto: esCuotas ? cuotaMonto : null, primeraCuotaHoy: esCuotas ? primeraCuotaHoy : false, canje,
      canjeEquipo: canje ? canjeEquipoLabel : null,
      canjeValor: canje ? canjeNum : null, lineas,
      vendedorNumero: vendedorNumero ? parseInt(vendedorNumero, 10) : null,
      canjeEquipoData: canje && canjeModelo ? {
        categoria: canjeCategoria, modelo: canjeModelo, cap: canjeCap || null,
        color: canjeColor || null, cond: canjeCond,
        bat: canjeIsPhone ? (canjeBat ? parseInt(canjeBat, 10) : null)
           : canjeIsConsola ? canjeControlesNum
           : null,
        imei: canjeIsPhone ? (canjeImei || '') : '',
        defectos: canjeIsConsola ? (canjeExtras || '') : '',
        usd: canjeNum, costo: canjeNum,
        proveedor: 'Plan canje', estado: 'disponible', cantidad: 1,
      } : null,
    };
  };

  const buildReservaData = () => ({
    equipoId: primerEq?.id || null, clienteId,
    equipo: primerEq?.modelo || '',
    spec: [primerEq?.cap, primerEq?.color].filter(Boolean).join(' · '),
    cliente, sena: seniaNum, usd: vPrecioUSD,
  });

  const stepLabel = () => ({ ...MONO(11, '#74a8d6'), border: '1px solid rgba(116,168,214,0.4)', borderRadius: 6, padding: '2px 7px' });
  const pillSel   = { padding: '16px', borderRadius: 13, background: 'rgba(116,168,214,0.12)', border: '1px solid rgba(116,168,214,0.5)', textAlign: 'left' };
  const pillUnsel = { padding: '16px', borderRadius: 13, background: 'rgba(231,238,246,0.02)', border: '1px solid rgba(231,238,246,0.09)', textAlign: 'left' };

  return (
    <div>
      {nuevoClienteModal && <NuevoClienteModal nombre={clienteSearch} clientes={clientes} onSave={handleNuevoCliente} onClose={() => setNuevoClienteModal(false)} />}
      {packModal?.mode === 'create' && <PackModal equipos={equipos} onSave={p => { savePacksState([...packs, p]); setPackModal(null); }} onClose={() => setPackModal(null)} />}
      {packModal?.mode === 'edit'   && <PackModal pack={packModal.pack} equipos={equipos} onSave={p => { savePacksState(packs.map(x => x.id === p.id ? p : x)); setPackModal(null); }} onClose={() => setPackModal(null)} />}

      <div style={{ marginBottom: 28 }}>
        <div style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Nueva operación</div>
        <h1 className="page-title">Registrar una <span style={SERIF('inherit', '#9ec6ec')}>venta</span></h1>
      </div>

      <div className="rg-venta">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>

          {/* Step 01 – Equipos */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 15 }}>
              <span style={stepLabel()}>01</span>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>Equipos</span>
              {carrito.length > 0 && <span style={{ fontSize: 12.5, color: '#82b39d', marginLeft: 'auto' }}>✓ {totalUnidades} ítem{totalUnidades > 1 ? 's' : ''} · {fUSD(vPrecioUSD)}</span>}
            </div>

            {/* Carrito summary */}
            {carrito.length > 0 && (
              <div style={{ marginBottom: 14, padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(130,179,157,0.25)', background: 'rgba(130,179,157,0.04)' }}>
                <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>En esta venta</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {carrito.map(e => {
                    return (
                      <div key={e.carritoId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 500, color: '#eef2f7' }}>
                            {e.modelo}{e.cap ? ` · ${e.cap}` : ''}{e.color ? ` · ${e.color}` : ''}
                          </span>
                          {(e.cantidadVenta || 1) > 1 && <span style={{ fontSize: 12, color: '#828a94', marginLeft: 6 }}>x{e.cantidadVenta}</span>}
                        </div>
                        {e.esRegalo
                          ? <span style={{ fontSize: 12, color: '#82b39d', padding: '2px 8px', borderRadius: 5, background: 'rgba(130,179,157,0.12)', border: '1px solid rgba(130,179,157,0.3)', whiteSpace: 'nowrap' }}>🎁 Regalo</span>
                          : <PrecioInput key={e.carritoId} item={e} onUpdate={updatePrecio} />
                        }
                        <button onClick={() => toggleRegalo(e.carritoId)} title={e.esRegalo ? 'Quitar regalo' : 'Marcar como regalo ($0)'} style={{ padding: '3px 8px', borderRadius: 6, background: 'none', border: `1px solid ${e.esRegalo ? 'rgba(130,179,157,0.4)' : 'rgba(231,238,246,0.1)'}`, cursor: 'pointer', color: e.esRegalo ? '#82b39d' : '#6a717b', fontSize: 12 }}>
                          {e.esRegalo ? '✓ Regalo' : '🎁'}
                        </button>
                        <button onClick={() => removeFromCarrito(e.carritoId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a717b', fontSize: 14, padding: '2px 4px', lineHeight: 1 }}>✕</button>
                      </div>
                    );
                  })}
                </div>
                {(carrito.length > 1 || hayRegalos) && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(231,238,246,0.08)', gap: 12, alignItems: 'center' }}>
                    {hayRegalos && <span style={{ fontSize: 12, color: '#828a94' }}>Ítems de regalo no suman al total</span>}
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#eef2f7' }}>Total {fUSD(vPrecioUSD)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Packs */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: packMsg ? 9 : 0, flexWrap: 'wrap' }}>
                <span style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', color: '#6a717b' }}>Packs</span>
                {packs.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'stretch' }}>
                    <button onClick={() => applyPack(p)} style={{ padding: '5px 11px', borderRadius: '8px 0 0 8px', border: '1px solid rgba(155,147,214,0.3)', borderRight: 'none', background: 'rgba(155,147,214,0.07)', color: '#b0a8d6', fontSize: 12.5, cursor: 'pointer', fontWeight: 500 }}>▷ {p.nombre}</button>
                    <button onClick={() => setPackModal({ mode: 'edit', pack: p })} title="Editar" style={{ padding: '5px 7px', border: '1px solid rgba(155,147,214,0.3)', borderRight: 'none', background: 'rgba(155,147,214,0.04)', color: '#6a717b', fontSize: 11, cursor: 'pointer' }}>✎</button>
                    <button onClick={() => deletePack(p.id)} title="Eliminar pack" style={{ padding: '5px 7px', borderRadius: '0 8px 8px 0', border: '1px solid rgba(155,147,214,0.3)', background: 'rgba(155,147,214,0.04)', color: '#6a717b', fontSize: 11, cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
                <button onClick={() => setPackModal({ mode: 'create' })} style={{ padding: '5px 11px', borderRadius: 8, border: '1px dashed rgba(155,147,214,0.3)', background: 'rgba(155,147,214,0.03)', color: '#9b93d6', fontSize: 12.5, cursor: 'pointer' }}>+ Crear pack</button>
              </div>
              {packMsg && (
                <div style={{ fontSize: 12.5, color: packMsg.startsWith('✓') ? '#82b39d' : '#d98a76', padding: '7px 12px', borderRadius: 8, background: packMsg.startsWith('✓') ? 'rgba(130,179,157,0.08)' : 'rgba(217,138,118,0.08)', border: `1px solid ${packMsg.startsWith('✓') ? 'rgba(130,179,157,0.2)' : 'rgba(217,138,118,0.2)'}`, marginTop: 8 }}>
                  {packMsg}
                </div>
              )}
            </div>

            <EquipoPicker equipos={equipos} carrito={carrito} onAdd={addToCarrito} onRemoveAll={removeAllFromCarrito} onDecrement={decrementCarrito} />
          </div>

          {/* Step 02 – Cliente */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 15 }}>
              <span style={stepLabel()}>02</span>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>Cliente</span>
              {cliente && <span style={{ fontSize: 12.5, color: '#82b39d', marginLeft: 'auto' }}>✓ {cliente}</span>}
            </div>
            {!cliente ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '11px 15px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.08)' }}>
                  <span style={{ color: '#6a717b', fontSize: 14 }}>⌕</span>
                  <input value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} placeholder="Buscar por nombre o DNI…" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 13.5 }} />
                  {clienteSearch && <button onClick={() => setClienteSearch('')} style={{ background: 'none', border: 'none', color: '#6a717b', cursor: 'pointer', fontSize: 15, padding: 0 }}>×</button>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {clienteMatches.map(c => (
                    <button key={c.id} onClick={() => { setCliente(c.nombre); setClienteId(c.id); setClienteSearch(''); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '11px 15px', borderRadius: 11, border: '1px solid rgba(231,238,246,0.08)', background: 'rgba(231,238,246,0.02)', cursor: 'pointer' }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(116,168,214,0.14)', color: '#9ec6ec', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{c.inicial}</span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#eef2f7' }}>{c.nombre}</span>
                      <span style={{ ...MONO(12), color: '#828a94' }}>DNI {c.dni}</span>
                    </button>
                  ))}
                  <button onClick={() => setNuevoClienteModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 15px', borderRadius: 11, border: '1px dashed rgba(116,168,214,0.3)', background: 'rgba(116,168,214,0.04)', color: '#74a8d6', fontSize: 13.5, cursor: 'pointer', alignSelf: 'flex-start' }}>
                    + Registrar como cliente nuevo{clienteSearch ? ` "${clienteSearch}"` : ''}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 11, border: '1px solid rgba(116,168,214,0.3)', background: 'rgba(116,168,214,0.06)' }}>
                <span style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7' }}>{cliente}</span>
                <button onClick={() => { setCliente(''); setClienteId(null); }} style={{ background: 'none', border: 'none', color: '#6a717b', cursor: 'pointer', fontSize: 13 }}>Cambiar</button>
              </div>
            )}
          </div>

          {/* Step 03 – Modalidad */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 15 }}>
              <span style={stepLabel()}>03</span>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>Modalidad de pago</span>
            </div>
            <div className="stack-mobile" style={{ marginBottom: 18 }}>
              {[['contado','Contado','Pago único'],['cuotas','En cuotas','Financiación propia']].map(([key, title, sub]) => {
                const sel = modalidad === key;
                return (
                  <button key={key} onClick={() => { setModalidad(key); setTieneApartado(false); }} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                    <div style={sel ? pillSel : pillUnsel}><div style={{ fontSize: 15, fontWeight: 600, color: sel ? '#eef2f7' : '#a6afba' }}>{title}</div><div style={{ fontSize: 12.5, color: sel ? '#93b8da' : '#828a94', marginTop: 2 }}>{sub}</div></div>
                  </button>
                );
              })}
            </div>

            {!esCuotas && (
              <div style={{ padding: 18, borderRadius: 13, border: '1px solid rgba(231,238,246,0.07)', background: 'rgba(231,238,246,0.015)', marginBottom: 4 }}>
                <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>¿El cliente paga ahora?</div>
                <div className="stack-mobile">
                  {[[false,'Sí, pago total','El cliente se lleva el equipo hoy'],[true,'Apartado con seña','El cliente paga una parte y busca después']].map(([val, t, sub]) => {
                    const sel = tieneApartado === val;
                    const disabled = val === true && !puedeApartado;
                    return (
                      <button key={String(val)} onClick={() => !disabled && setTieneApartado(val)} style={{ flex: 1, cursor: disabled ? 'default' : 'pointer', padding: 0, background: 'none', border: 'none', opacity: disabled ? 0.4 : 1 }}>
                        <div style={{ padding: '13px 14px', borderRadius: 11, background: sel ? 'rgba(116,168,214,0.1)' : 'rgba(231,238,246,0.02)', border: `1px solid ${sel ? 'rgba(116,168,214,0.4)' : 'rgba(231,238,246,0.08)'}`, textAlign: 'left' }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: sel ? '#eef2f7' : '#a6afba' }}>{t}</div>
                          <div style={{ fontSize: 11.5, color: sel ? '#93b8da' : '#6a717b', marginTop: 3, lineHeight: 1.4 }}>{disabled ? 'Solo disponible con 1 equipo' : sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {tieneApartado && puedeApartado && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 9 }}>Seña / Señal (USD)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 15px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)' }}>
                      <span style={{ color: '#828a94', fontSize: 15 }}>US$</span>
                      <input type="text" inputMode="decimal" value={seniaContado} onChange={e => setSeniaContado(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 15, fontWeight: 500 }} />
                    </div>
                    {seniaNum > 0 && (
                      <div style={{ fontSize: 12, color: '#828a94', marginTop: 7 }}>
                        Si el cliente paga en pesos: ≈ {fARS(seniaNum * tc)} al TC de hoy
                      </div>
                    )}
                    {seniaNum > 0 && vPrecioUSD > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(116,168,214,0.06)', border: '1px solid rgba(116,168,214,0.15)' }}>
                        <span style={{ fontSize: 13, color: '#a6afba' }}>Saldo pendiente al retirar</span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#9ec6ec', whiteSpace: 'nowrap' }}>{fUSD(saldoContadoUSD)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {esCuotas && (
              <div style={{ padding: 18, borderRadius: 13, border: '1px solid rgba(231,238,246,0.07)', background: 'rgba(231,238,246,0.015)' }}>
                <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 11 }}>Cantidad de cuotas</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[3, 6, 9, 12].map(n => (
                    <button key={n} onClick={() => { setCuotas(n); setCuotasCustom(false); }} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                      <div style={{ padding: '11px 0', borderRadius: 10, background: !cuotasCustom && cuotas === n ? '#74a8d6' : 'rgba(231,238,246,0.04)', color: !cuotasCustom && cuotas === n ? '#14171c' : '#a6afba', fontSize: 14, fontWeight: !cuotasCustom && cuotas === n ? 600 : 500, textAlign: 'center' }}>{n}</div>
                    </button>
                  ))}
                  <button onClick={() => setCuotasCustom(true)} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                    <div style={{ padding: '11px 0', borderRadius: 10, background: cuotasCustom ? 'rgba(116,168,214,0.15)' : 'rgba(231,238,246,0.04)', color: cuotasCustom ? '#74a8d6' : '#a6afba', fontSize: 13, fontWeight: cuotasCustom ? 600 : 500, textAlign: 'center', border: cuotasCustom ? '1px solid rgba(116,168,214,0.4)' : '1px solid transparent' }}>Otra</div>
                  </button>
                </div>
                {cuotasCustom && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 9 }}>Cantidad personalizada</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 15px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(116,168,214,0.3)' }}>
                      <input type="number" min="1" max="60" value={cuotas || ''} onChange={e => setCuotas(parseInt(e.target.value) || 0)} onWheel={e => e.target.blur()} placeholder="ej. 18" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 15, fontWeight: 500 }} />
                      <span style={{ fontSize: 13, color: '#828a94' }}>cuotas</span>
                    </div>
                  </div>
                )}
                <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 9 }}>Anticipo (USD)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 15px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)' }}>
                  <span style={{ color: '#828a94', fontSize: 15 }}>US$</span>
                  <input type="text" inputMode="decimal" value={anticipo} onChange={e => setAnticipo(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 15, fontWeight: 500 }} />
                </div>
                <button onClick={() => setPrimeraCuotaHoy(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '13px 15px', marginTop: 10, borderRadius: 11, border: `1px solid ${primeraCuotaHoy ? 'rgba(130,179,157,0.5)' : 'rgba(231,238,246,0.09)'}`, background: primeraCuotaHoy ? 'rgba(130,179,157,0.08)' : 'rgba(231,238,246,0.02)', cursor: 'pointer' }}>
                  <span style={{ width: 17, height: 17, borderRadius: 4, border: `1.5px solid ${primeraCuotaHoy ? '#82b39d' : 'rgba(231,238,246,0.25)'}`, background: primeraCuotaHoy ? 'rgba(130,179,157,0.3)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {primeraCuotaHoy && <span style={{ fontSize: 11, color: '#eef2f7', fontWeight: 700 }}>✓</span>}
                  </span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: primeraCuotaHoy ? '#eef2f7' : '#a6afba' }}>Primera cuota hoy</div>
                    <div style={{ fontSize: 11.5, color: primeraCuotaHoy ? '#82b39d' : '#6a717b', marginTop: 1 }}>Se registra como cobrada · el resto arranca el mes que viene</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Step 04 – Método */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 15 }}>
              <span style={stepLabel()}>04</span>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>Método de pago</span>
            </div>
            <button onClick={() => { setCanje(!canje); setCanjeCategoria('iPhone'); setCanjeModelo(''); setCanjeCap(''); setCanjeColor(''); setCanjeCond('Usado'); setCanjeImei(''); setCanjeBat(''); setCanjeControles('1'); setCanjeExtras(''); setCanjeValor(''); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '13px 16px', borderRadius: 12, border: `1px solid ${canje ? 'rgba(166,175,186,0.5)' : 'rgba(231,238,246,0.1)'}`, background: canje ? 'rgba(166,175,186,0.1)' : 'rgba(231,238,246,0.02)', cursor: 'pointer', marginBottom: 16 }}>
              <span style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${canje ? '#a6afba' : 'rgba(231,238,246,0.25)'}`, background: canje ? 'rgba(166,175,186,0.3)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {canje && <span style={{ fontSize: 11, color: '#eef2f7', fontWeight: 700 }}>✓</span>}
              </span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: canje ? '#eef2f7' : '#a6afba' }}>Plan canje</div>
                <div style={{ fontSize: 11.5, color: canje ? '#a6afba' : '#6a717b', marginTop: 1 }}>El cliente entrega un equipo como parte del pago</div>
              </div>
            </button>

            {canje && (
              <div style={{ padding: 18, borderRadius: 13, border: '1px solid rgba(166,175,186,0.2)', background: 'rgba(166,175,186,0.04)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', color: '#6a717b' }}>Equipo entregado en canje</div>
                <div><span style={CANJE_LB}>Categoría</span>
                  <select value={canjeCategoria} onChange={e => { setCanjeCategoria(e.target.value); setCanjeModelo(''); setCanjeCap(''); setCanjeColor(''); setCanjeControles('1'); setCanjeExtras(''); }} style={CANJE_SEL}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><span style={CANJE_LB}>Modelo</span><CanjeCombo value={canjeModelo} onChange={setCanjeModelo} options={getModelos(canjeCategoria)} placeholder="ej. iPhone 13 / PS5" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><span style={CANJE_LB}>{canjeDef.capLabel}</span><CanjeCombo value={canjeCap} onChange={setCanjeCap} options={getCaps(canjeCategoria) || []} placeholder={canjeIsConsola ? 'ej. Edición Disco' : 'ej. 128 GB'} /></div>
                  <div><span style={CANJE_LB}>Color</span><CanjeCombo value={canjeColor} onChange={setCanjeColor} options={getColores(canjeCategoria) || []} placeholder="ej. Negro" /></div>
                </div>
                <div><span style={CANJE_LB}>Condición</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Nuevo','Usado'].map(c => <button key={c} onClick={() => setCanjeCond(c)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${canjeCond === c ? 'rgba(116,168,214,0.5)' : 'rgba(231,238,246,0.09)'}`, background: canjeCond === c ? 'rgba(116,168,214,0.12)' : 'rgba(231,238,246,0.02)', color: canjeCond === c ? '#9ec6ec' : '#828a94', fontSize: 13.5, fontWeight: canjeCond === c ? 600 : 400, cursor: 'pointer' }}>{c}</button>)}
                  </div>
                </div>
                {canjeIsPhone && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
                    <div><span style={CANJE_LB}>IMEI</span><input value={canjeImei} onChange={e => setCanjeImei(e.target.value)} placeholder="350000000000000" style={CANJE_IN} /></div>
                    <div><span style={CANJE_LB}>Batería (%)</span><input type="text" inputMode="numeric" value={canjeBat} onChange={e => setCanjeBat(e.target.value.replace(/[^0-9]/g,''))} placeholder="ej. 87" style={CANJE_IN} /></div>
                  </div>
                )}
                {canjeIsConsola && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
                    <div>
                      <span style={CANJE_LB}>Controles</span>
                      <select value={canjeControles} onChange={e => setCanjeControles(e.target.value)} style={CANJE_SEL}>
                        {['0','1','2','3','4'].map(n => (
                          <option key={n} value={n}>{n === '0' ? 'Sin controles' : `${n} control${n !== '1' ? 'es' : ''}`}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span style={CANJE_LB}>Juegos / accesorios incluidos</span>
                      <input value={canjeExtras} onChange={e => setCanjeExtras(e.target.value)} placeholder="ej. FIFA 25, HDMI, base de carga…" style={CANJE_IN} />
                    </div>
                  </div>
                )}
                <div><span style={CANJE_LB}>Valor del equipo (USD) — será el costo en stock</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 15px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)' }}>
                    <span style={{ color: '#828a94', fontSize: 15 }}>US$</span>
                    <input type="text" inputMode="decimal" value={canjeValor} onChange={e => setCanjeValor(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 15, fontWeight: 500 }} />
                  </div>
                </div>
                {canjeNum > 0 && vPrecioARS > 0 && (
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#828a94', marginBottom: 6 }}><span>Precio</span><span>{fARS(vPrecioARS)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#82b39d', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(231,238,246,0.08)' }}><span>− Canje ({fUSD(canjeNum)})</span><span>−{fARS(canjeNum * tc)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: '#eef2f7' }}><span>Saldo</span><span>{fARS(saldoTrasCanje)}</span></div>
                  </div>
                )}
              </div>
            )}

            <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, color: '#6a717b' }}>
              {canje && canjeNum > 0 ? 'Método para el saldo' : 'Forma de pago'}
            </div>
            <div className="pay-methods">
              {['Transferencia','Débito','Crédito','Efectivo'].map(m => {
                const sel = metodo === m;
                return (
                  <button key={m} onClick={() => setMetodo(m)} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                    <div style={{ padding: '12px 8px', borderRadius: 11, background: sel ? 'rgba(116,168,214,0.14)' : 'rgba(231,238,246,0.03)', border: `1px solid ${sel ? 'rgba(116,168,214,0.45)' : 'rgba(231,238,246,0.08)'}`, color: sel ? '#eef2f7' : '#828a94', fontSize: 13, fontWeight: sel ? 600 : 500, textAlign: 'center' }}>{m}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 05 – Vendedor */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 15 }}>
              <span style={stepLabel()}>05</span>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>Vendedor</span>
            </div>
            <VendedorStep vendedorNumero={vendedorNumero} onChangeNumero={setVendedorNumero} />
          </div>
        </div>

        {/* Comprobante (derecha) */}
        <div className="sticky-panel" style={{ padding: 28, borderRadius: 20, border: '1px solid rgba(116,168,214,0.22)', background: 'linear-gradient(160deg, rgba(116,168,214,0.07), #181b20 55%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <span style={SERIF(22)}>Comprobante</span>
            <span style={{ ...MONO(9.5, '#93b8da'), letterSpacing: 1.5, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20, border: '1px solid rgba(116,168,214,0.3)' }}>Borrador</span>
          </div>

          <div style={{ paddingBottom: 18, borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
            {carrito.length === 0 ? (
              <div style={{ fontSize: 14, color: '#4a5058' }}>Agregá al menos un equipo</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {carrito.map((e, i) => {
                  const cDef    = getCatDef(e.categoria);
                  const isPhone = cDef.tieneIMEI;
                  const isCons  = cDef.tieneControles;
                  const precioMostrar = e.esRegalo ? 0 : effPrecio(e) * (e.cantidadVenta || 1);
                  return (
                    <div key={e.carritoId} style={{ paddingBottom: carrito.length > 1 && i < carrito.length - 1 ? 12 : 0, borderBottom: carrito.length > 1 && i < carrito.length - 1 ? '1px solid rgba(231,238,246,0.06)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7' }}>
                          {e.modelo}
                          {(e.cantidadVenta || 1) > 1 && <span style={{ fontSize: 12, fontWeight: 400, color: '#828a94', marginLeft: 5 }}>x{e.cantidadVenta}</span>}
                        </div>
                        {e.esRegalo
                          ? <span style={{ fontSize: 12, color: '#82b39d', padding: '2px 7px', borderRadius: 4, background: 'rgba(130,179,157,0.1)', whiteSpace: 'nowrap' }}>🎁 Regalo</span>
                          : <div style={{ fontSize: 14, fontWeight: 600, color: '#eef2f7', whiteSpace: 'nowrap' }}>{fUSD(precioMostrar)}</div>
                        }
                      </div>
                      <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 1 }}>{[e.cap, e.color].filter(Boolean).join(' · ')}</div>
                      {isPhone && e.imei && <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}><span style={{ ...MONO(10, '#6a717b'), letterSpacing: 1, textTransform: 'uppercase' }}>IMEI</span><span style={{ ...MONO(11.5, '#a6afba') }}>{e.imei}</span></div>}
                      {isPhone && e.cond === 'Usado' && e.bat && <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}><span style={{ ...MONO(10, '#6a717b'), letterSpacing: 1, textTransform: 'uppercase' }}>Bat.</span><BatBadge bat={e.bat} /></div>}
                      {isCons && e.bat > 0 && <div style={{ fontSize: 12, color: '#9b93d6', marginTop: 4 }}>{e.bat} control{e.bat !== 1 ? 'es' : ''}</div>}
                      {isCons && e.defectos && <div style={{ fontSize: 12, color: '#828a94', marginTop: 2 }}>{e.defectos}</div>}
                      {!isCons && e.defectos && <div style={{ marginTop: 6, padding: '5px 8px', borderRadius: 7, background: 'rgba(217,138,118,0.08)', border: '1px solid rgba(217,138,118,0.2)', fontSize: 11.5, color: '#e6ab98' }}>⚠ {e.defectos}</div>}
                    </div>
                  );
                })}
              </div>
            )}
            {carrito.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={SERIF(carrito.length > 1 ? 26 : 32, '#f6f9fc')}>{fUSD(vPrecioUSD)}</span>
                  <span style={{ fontSize: 13, color: '#828a94' }}>{fARS(vPrecioARS)}</span>
                </div>
                {hayRegalos && <div style={{ fontSize: 12, color: '#82b39d', marginTop: 3 }}>Incluye ítems de regalo</div>}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, padding: '18px 0', borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13.5, color: '#828a94' }}>Cliente</span>
              <span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 500 }}>{cliente || '—'}</span>
            </div>
            {canje && canjeNum > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13.5, color: '#828a94', flexShrink: 0 }}>Canje</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13.5, color: '#82b39d', fontWeight: 500 }}>{fUSD(canjeNum)} <span style={{ fontSize: 11, color: '#6a717b' }}>({fARS(canjeNum * tc)})</span></div>
                    {canjeEquipoLabel && <div style={{ fontSize: 11, color: '#6a717b', marginTop: 1 }}>{canjeEquipoLabel}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13.5, color: '#828a94' }}>Saldo · {metodo}</span>
                  <span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 500 }}>{fARS(saldoTrasCanje)}</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13.5, color: '#828a94' }}>Método</span>
                <span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 500 }}>{metodo}</span>
              </div>
            )}
            {!esCuotas && !tieneApartado && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 13.5, color: '#828a94' }}>Modalidad</span><span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 500 }}>Contado · pago total</span></div>}
            {!esCuotas && tieneApartado && <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 13.5, color: '#828a94' }}>Modalidad</span><span style={{ fontSize: 13.5, color: '#74a8d6', fontWeight: 500 }}>Apartado con seña</span></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 13.5, color: '#828a94' }}>Seña</span><span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 600 }}>{fUSD(seniaNum)}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 13.5, color: '#828a94' }}>Saldo al retirar</span><span style={{ fontSize: 13.5, color: '#9ec6ec', fontWeight: 600 }}>{fUSD(saldoContadoUSD)}</span></div>
            </>}
            {esCuotas && <>
              {antNum > 0 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 13.5, color: '#828a94' }}>Anticipo</span><span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 500 }}>{fUSD(antNum)}</span></div>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 13.5, color: '#828a94' }}>A financiar</span><span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 500 }}>{fUSD(aFinanciar)}</span></div>
            </>}
          </div>

          {esCuotas && cuotas > 0 && (() => {
            const ultima = Math.max(0, Math.round((aFinanciar - cuotaMonto * (cuotas - 1)) * 100) / 100);
            const ajusta = aFinanciar > 0 && ultima !== cuotaMonto;
            return (
              <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
                <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase' }}>Plan de pago</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 15, color: '#a6afba' }}>{ajusta ? `${cuotas - 1} cuotas de` : `${cuotas} cuotas de`}</span>
                  <span style={SERIF(26, '#9ec6ec')}>{fUSD(cuotaMonto)}</span>
                </div>
                {ajusta && (
                  <div style={{ fontSize: 12.5, color: '#a6afba', marginTop: 4 }}>+ última cuota de <span style={{ color: '#9ec6ec', fontWeight: 600 }}>{fUSD(ultima)}</span> (ajuste de redondeo)</div>
                )}
                {primeraCuotaHoy && (
                  <div style={{ fontSize: 12, color: '#82b39d', marginTop: 5 }}>Cuota 1 hoy · cobrada · resto desde el mes que viene</div>
                )}
              </div>
            );
          })()}

          <div style={{ marginTop: 22 }}>
            {carrito.length > 0 && cliente && ventaErrors.length > 0 && (
              <div style={{ marginBottom: 12, padding: '10px 13px', borderRadius: 10, background: 'rgba(217,138,118,0.08)', border: '1px solid rgba(217,138,118,0.25)' }}>
                {ventaErrors.map((e, i) => <div key={i} style={{ fontSize: 12, color: '#e6ab98', lineHeight: 1.7 }}>· {e}</div>)}
              </div>
            )}
            {canConfirm
              ? <button onClick={() => { if (tieneApartado && puedeApartado) { onConfirmApartado(buildReservaData()); resetForm(); } else { onConfirm(buildVentaData()); resetForm(); } }} style={{ width: '100%', padding: 15, borderRadius: 13, border: '1px solid rgba(255,255,255,0.2)', background: 'linear-gradient(160deg, #eef2f6, #b7c3ce)', color: '#14171c', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 22px -10px rgba(180,200,220,0.7)' }}>
                {tieneApartado && puedeApartado ? 'Registrar reserva' : 'Confirmar venta'}
              </button>
              : <div style={{ width: '100%', padding: 15, borderRadius: 13, background: 'rgba(231,238,246,0.04)', color: '#6a717b', fontSize: 15, fontWeight: 600, textAlign: 'center' }}>
                  {carrito.length === 0 ? 'Agregá al menos un equipo' : !cliente ? 'Elegí un cliente' : 'Corregí los errores'}
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
