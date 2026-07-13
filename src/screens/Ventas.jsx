import { useState, useRef, useCallback, useEffect } from 'react';
import { fARS, fUSD } from '../lib/utils.js';
import Modal from '../components/Modal.jsx';
import VentaDetalleModal from '../components/VentaDetalleModal.jsx';
import { uploadGarantia, deleteGarantia } from '../lib/db.js';

function EditCostoModal({ venta, onSave, onClose }) {
  const [costo, setCosto] = useState(venta.costo ? String(venta.costo) : '');
  const costoNum = parseFloat(costo) || 0;
  const ganancia = costoNum > 0 ? venta.usd - costoNum : null;
  const margen   = costoNum > 0 ? Math.round((ganancia / costoNum) * 100) : null;
  const field = { width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)', color: '#eef2f7', fontSize: 15, fontWeight: 500, boxSizing: 'border-box', fontFamily: "'Hanken Grotesk', sans-serif" };
  return (
    <Modal title={`Costo · ${venta.equipo}`} onClose={onClose} width={400}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, color: '#6a717b' }}>Costo en USD</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 15px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)', marginBottom: 16 }}>
        <span style={{ color: '#828a94', fontSize: 15 }}>US$</span>
        <input type="number" min="0" step="0.01" value={costo} onChange={e => setCosto(e.target.value)} onWheel={e => e.target.blur()} placeholder="0" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 15, fontWeight: 500 }} autoFocus />
      </div>
      {ganancia !== null && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: ganancia >= 0 ? 'rgba(130,179,157,0.08)' : 'rgba(217,138,118,0.08)', border: `1px solid ${ganancia >= 0 ? 'rgba(130,179,157,0.2)' : 'rgba(217,138,118,0.2)'}`, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#a6afba', marginBottom: 4 }}>
            <span>Precio venta</span><span>{fUSD(venta.usd)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#a6afba', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
            <span>Costo</span><span>−{fUSD(costoNum)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600, color: ganancia >= 0 ? '#82b39d' : '#d98a76' }}>
            <span>Ganancia</span>
            <span>{ganancia >= 0 ? '+' : ''}{fUSD(ganancia)}{margen !== null ? ` · ${margen}%` : ''}</span>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 11, border: '1px solid rgba(231,238,246,0.12)', background: 'none', color: '#a6afba', fontSize: 14, cursor: 'pointer', fontFamily: "'Hanken Grotesk', sans-serif" }}>Cancelar</button>
        <button onClick={() => costoNum > 0 && onSave(venta.id, costoNum)} style={{ flex: 2, padding: 12, borderRadius: 11, border: '1px solid rgba(255,255,255,0.2)', background: costoNum > 0 ? 'linear-gradient(160deg, #eef2f6, #b7c3ce)' : 'rgba(231,238,246,0.05)', color: costoNum > 0 ? '#14171c' : '#6a717b', fontSize: 14, fontWeight: 600, cursor: costoNum > 0 ? 'pointer' : 'default', fontFamily: "'Hanken Grotesk', sans-serif" }}>Guardar</button>
      </div>
    </Modal>
  );
}

function DeleteVentaModal({ venta, onConfirm, onClose }) {
  return (
    <Modal title="Eliminar venta" onClose={onClose} width={420}>
      <p style={{ fontSize: 14.5, color: '#a6afba', marginBottom: 10 }}>
        ¿Eliminás la venta de <span style={{ color: '#eef2f7', fontWeight: 600 }}>{venta.equipo}</span> a {venta.cliente}?
      </p>
      <p style={{ fontSize: 13, color: '#d98a76', marginBottom: 24, lineHeight: 1.5 }}>
        Esta acción no se puede deshacer. Si el equipo está en tu stock, tenés que restaurarlo manualmente desde la pestaña Stock.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 11, border: '1px solid rgba(231,238,246,0.12)', background: 'none', color: '#a6afba', fontSize: 14, cursor: 'pointer', fontFamily: "'Hanken Grotesk', sans-serif" }}>Cancelar</button>
        <button onClick={() => onConfirm(venta.id)} style={{ flex: 1, padding: 12, borderRadius: 11, border: 'none', background: '#c0655a', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Hanken Grotesk', sans-serif" }}>Eliminar venta</button>
      </div>
    </Modal>
  );
}

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });

const VEND_KEY = 'iconic_vendedores';
function loadVendedores() {
  try { return JSON.parse(localStorage.getItem(VEND_KEY) || '[]'); }
  catch { return []; }
}

function VendedorModal({ vendedores, onSave, onClose }) {
  const nextNum = vendedores.length > 0 ? Math.max(...vendedores.map(v => v.numero)) + 1 : 1;
  const [numero, setNumero] = useState(String(nextNum));
  const [nombre, setNombre] = useState('');
  const numInt = parseInt(numero, 10);
  const yaExiste = vendedores.some(v => v.numero === numInt);
  const canSave = nombre.trim().length > 0 && numInt > 0;
  const ML = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7, color: '#6a717b', display: 'block' };
  const IN = { width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)', color: '#eef2f7', fontSize: 14, boxSizing: 'border-box' };
  return (
    <Modal title="Registrar vendedor" onClose={onClose} width={420}>
      {vendedores.length > 0 && (
        <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.03)', border: '1px solid rgba(231,238,246,0.07)' }}>
          <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Vendedores registrados</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[...vendedores].sort((a,b) => a.numero - b.numero).map(v => (
              <div key={v.numero} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#a6afba' }}>
                <span style={{ ...MONO(12, '#74a8d6'), minWidth: 28 }}>#{v.numero}</span>
                <span>{v.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12, marginBottom: 18 }}>
        <div>
          <span style={ML}>Nº vendedor</span>
          <input type="number" min="1" value={numero} onChange={e => setNumero(e.target.value)} onWheel={e => e.target.blur()} style={IN} autoFocus />
          {yaExiste && <div style={{ fontSize: 11, color: '#d98a76', marginTop: 4 }}>Ya existe, va a reemplazarlo</div>}
        </div>
        <div>
          <span style={ML}>Nombre</span>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del vendedor" style={IN} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 11, border: '1px solid rgba(231,238,246,0.12)', background: 'none', color: '#a6afba', fontSize: 14, cursor: 'pointer', fontFamily: "'Hanken Grotesk', sans-serif" }}>Cancelar</button>
        <button onClick={() => canSave && onSave({ numero: numInt, nombre: nombre.trim() })} style={{ flex: 2, padding: 12, borderRadius: 11, border: '1px solid rgba(255,255,255,0.2)', background: canSave ? 'linear-gradient(160deg, #eef2f6, #b7c3ce)' : 'rgba(231,238,246,0.05)', color: canSave ? '#14171c' : '#6a717b', fontSize: 14, fontWeight: 600, cursor: canSave ? 'pointer' : 'default', fontFamily: "'Hanken Grotesk', sans-serif" }}>
          {yaExiste ? 'Actualizar' : 'Registrar'}
        </button>
      </div>
    </Modal>
  );
}

const METODO_COLORS = {
  'Transferencia': { bg: 'rgba(116,168,214,0.1)',  color: '#74a8d6' },
  'Débito':        { bg: 'rgba(130,179,157,0.1)',  color: '#82b39d' },
  'Crédito':       { bg: 'rgba(155,147,214,0.12)', color: '#9b93d6' },
  'Efectivo':      { bg: 'rgba(231,238,246,0.07)', color: '#a6afba' },
};

function StatCard({ label, value, sub }) {
  return (
    <div style={{ padding: '22px 24px', borderRadius: 18, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20', minWidth: 0 }}>
      <div style={{ ...MONO(10), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ ...SERIF('clamp(23px, 5.5vw, 34px)', '#eef2f7'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      {sub && <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function GarantiaModal({ venta, onClose, onDelete }) {
  const urls  = (venta.garantiaUrl    || '').split('|').filter(Boolean);
  const names = (venta.garantiaNombre || '').split('|').filter(Boolean);
  const isPdf = urls.length > 0 && urls[0].toLowerCase().includes('.pdf');
  const btnBase = { padding: '10px 18px', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontFamily: "'Hanken Grotesk', sans-serif", textDecoration: 'none' };
  return (
    <Modal title={`Garantía · ${venta.equipo}`} onClose={onClose} width={720}>
      <div style={{ fontSize: 12.5, color: '#828a94', marginBottom: 16, fontFamily: "'JetBrains Mono', monospace" }}>
        {names.join(' · ')}
      </div>
      {isPdf && (
        <iframe src={urls[0]} title="Garantía PDF" style={{ width: '100%', height: 560, borderRadius: 12, border: '1px solid rgba(231,238,246,0.1)' }} />
      )}
      {!isPdf && urls.map((url, i) => (
        <img key={i} src={url} alt={`Garantía ${i + 1}`}
          style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(231,238,246,0.1)', maxHeight: 420, objectFit: 'contain', background: '#111', marginBottom: i < urls.length - 1 ? 12 : 0 }}
        />
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <button onClick={() => onDelete(venta.id, venta.garantiaUrl)}
          style={{ ...btnBase, background: 'rgba(217,138,118,0.1)', border: '1px solid rgba(217,138,118,0.3)', color: '#d98a76' }}>
          Eliminar garantía
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {urls.map((url, i) => (
            <a key={i} href={url} download={names[i] || `garantia${urls.length > 1 ? `_${i + 1}` : ''}`}
              style={{ ...btnBase, background: 'rgba(116,168,214,0.12)', border: '1px solid rgba(116,168,214,0.3)', color: '#74a8d6', display: 'inline-block' }}>
              {urls.length > 1 ? `Descargar (${i + 1})` : 'Descargar'}
            </a>
          ))}
        </div>
      </div>
    </Modal>
  );
}

async function getPdfPageCount(file) {
  try {
    const buf = await file.arrayBuffer();
    const text = new TextDecoder('latin1').decode(new Uint8Array(buf));
    const m = text.match(/\/Type\s*\/Page[^s]/g);
    return m ? m.length : null;
  } catch {
    return null;
  }
}

async function validateGarantiaFiles(files) {
  const isJpg = f => /\.(jpe?g)$/i.test(f.name) || f.type === 'image/jpeg';
  const isPdf = f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf';
  const allJpg = files.every(isJpg);
  const allPdf = files.every(isPdf);
  if (!allJpg && !allPdf) return 'Solo se aceptan archivos PDF o imágenes JPG/JPEG.';
  if (allPdf) {
    if (files.length > 1) return 'Solo se puede adjuntar un PDF por garantía.';
    const pages = await getPdfPageCount(files[0]);
    if (pages !== null && pages > 2) return `El PDF tiene ${pages} páginas — el máximo permitido es 2.`;
  }
  if (allJpg && files.length > 2) return 'Se aceptan como máximo 2 imágenes JPG.';
  return null;
}

export default function Ventas({ ventas, tc, onUpdateVenta, onDeleteVenta, onError }) {
  const [q, setQ] = useState('');
  const [filtroMod, setFiltroMod] = useState('todas');
  const [filtroMet, setFiltroMet] = useState('todos');
  const [filtroMes, setFiltroMes] = useState('todos');
  const [verTodas, setVerTodas] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null);
  const [viewingGarantia, setViewingGarantia] = useState(null);
  const [deletingVenta, setDeletingVenta] = useState(null);
  const [editingCosto, setEditingCosto] = useState(null);
  const [detalleVenta, setDetalleVenta] = useState(null);
  const [vendedores, setVendedores] = useState(loadVendedores);
  const [vendedorModal, setVendedorModal] = useState(false);
  const fileInputRef = useRef(null);
  const uploadingForRef = useRef(null);

  const saveVendedor = (v) => {
    const updated = [...vendedores.filter(x => x.numero !== v.numero), v].sort((a,b) => a.numero - b.numero);
    setVendedores(updated);
    localStorage.setItem(VEND_KEY, JSON.stringify(updated));
    setVendedorModal(false);
  };

  const sorted = [...ventas].sort((a, b) => b.fechaNum - a.fechaNum);

  const MONTH_NAMES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const mesesDisp = Array.from(new Set(sorted.map(v => {
    const y = Math.floor(v.fechaNum / 10000);
    const m = Math.floor((v.fechaNum % 10000) / 100);
    return `${y}-${String(m).padStart(2,'0')}`;
  }))).sort().reverse();

  const mesLabel = (key) => {
    const [y, m] = key.split('-');
    return `${MONTH_NAMES_ES[parseInt(m) - 1]} ${y}`;
  };

  const qLow = q.trim().toLowerCase();
  const filtered = sorted.filter(v => {
    if (filtroMod !== 'todas' && v.modalidad !== filtroMod) return false;
    if (filtroMet !== 'todos' && v.metodo !== filtroMet) return false;
    if (filtroMes !== 'todos') {
      const y = Math.floor(v.fechaNum / 10000);
      const m = Math.floor((v.fechaNum % 10000) / 100);
      const key = `${y}-${String(m).padStart(2,'0')}`;
      if (key !== filtroMes) return false;
    }
    if (!qLow) return true;
    return (
      v.cliente.toLowerCase().includes(qLow) ||
      v.equipo.toLowerCase().includes(qLow) ||
      (v.imei || '').toLowerCase().includes(qLow)
    );
  });

  const anyFilter = filtroMod !== 'todas' || filtroMet !== 'todos' || filtroMes !== 'todos' || !!qLow;
  const display = verTodas || anyFilter ? filtered : filtered.slice(0, 10);

  const totalUSD = ventas.reduce((a, b) => a + b.usd, 0);
  const totalCosto = ventas.filter(v => v.costo).reduce((a, b) => a + (b.costo || 0), 0);
  const totalGanancia = ventas.filter(v => v.costo).reduce((a, b) => a + (b.usd - (b.costo || 0)), 0);
  const ventasCuotas = ventas.filter(v => v.modalidad === 'cuotas').length;

  const pill = (active) => ({
    padding: '5px 13px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer',
    border: 'none', fontFamily: "'Hanken Grotesk', sans-serif",
    background: active ? '#74a8d6' : 'rgba(231,238,246,0.06)',
    color: active ? '#14171c' : '#828a94',
    fontWeight: active ? 600 : 400,
  });

  const metodos = ['todos', ...Array.from(new Set(ventas.map(v => v.metodo)))];

  const handleGarantiaClick = (v) => {
    if (v.garantiaUrl) {
      setViewingGarantia(v.id);
    } else {
      uploadingForRef.current = v.id;
      setUploadingFor(v.id);
      fileInputRef.current.click();
    }
  };

  const handleFileChange = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';
    const ventaId = uploadingForRef.current;
    if (files.length === 0 || !ventaId) { setUploadingFor(null); return; }
    const err = await validateGarantiaFiles(files);
    if (err) { onError(err); setUploadingFor(null); return; }
    try {
      const { url, nombre } = await uploadGarantia(ventaId, files);
      await onUpdateVenta(ventaId, { garantiaUrl: url, garantiaNombre: nombre });
    } catch (e) {
      onError('Error al subir la garantía: ' + e.message);
    } finally {
      uploadingForRef.current = null;
      setUploadingFor(null);
    }
  }, [onError, onUpdateVenta]);

  const handleDeleteGarantia = async (id, garantiaUrl) => {
    try {
      await deleteGarantia(garantiaUrl);
      await onUpdateVenta(id, { garantiaUrl: null, garantiaNombre: null });
      setViewingGarantia(null);
    } catch (err) {
      onError('Error al eliminar la garantía: ' + err.message);
    }
  };

  const ventaViewing  = viewingGarantia ? ventas.find(v => v.id === viewingGarantia) : null;
  const ventaDeleting = deletingVenta   ? ventas.find(v => v.id === deletingVenta)   : null;
  const ventaEditing  = editingCosto    ? ventas.find(v => v.id === editingCosto)    : null;

  const cols = '0.65fr 2fr 1.1fr 1.4fr 0.9fr 1fr 38px 32px';

  return (
    <div>
      {ventaViewing  && <GarantiaModal      venta={ventaViewing}  onClose={() => setViewingGarantia(null)} onDelete={handleDeleteGarantia} />}
      {ventaDeleting && <DeleteVentaModal   venta={ventaDeleting} onClose={() => setDeletingVenta(null)}  onConfirm={(id) => { onDeleteVenta(id); setDeletingVenta(null); }} />}
      {ventaEditing  && <EditCostoModal     venta={ventaEditing}  onClose={() => setEditingCosto(null)}   onSave={(id, c) => { onUpdateVenta(id, { costo: c }); setEditingCosto(null); }} />}
      {detalleVenta  && <VentaDetalleModal  venta={detalleVenta}  onClose={() => setDetalleVenta(null)} />}
      {vendedorModal && <VendedorModal vendedores={vendedores} onSave={saveVendedor} onClose={() => setVendedorModal(false)} />}

      {/* Hidden file input for warranty upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,application/pdf"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Registro histórico</div>
          <h1 className="page-title">
            Historial de <span style={SERIF('inherit', '#9ec6ec')}>ventas</span>
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ ...MONO(12), color: '#6a717b' }}>{ventas.length} registros en total</span>
          <button onClick={() => setVendedorModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(116,168,214,0.3)', background: 'rgba(116,168,214,0.06)', color: '#74a8d6', fontSize: 13, cursor: 'pointer', fontFamily: "'Hanken Grotesk', sans-serif" }}>
            + Vendedor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="rg-stats4" style={{ marginBottom: 24 }}>
        <StatCard label="Total ventas" value={ventas.length} sub="registros históricos" />
        <StatCard label="Ingresos total" value={fUSD(totalUSD)} sub={fARS(totalUSD * tc) + ' al TC actual'} />
        <StatCard
          label="Ganancia registrada"
          value={totalCosto > 0 ? fUSD(totalGanancia) : '—'}
          sub={totalCosto > 0 ? `sobre ${ventas.filter(v => v.costo).length} ventas con costo cargado` : 'Cargá el costo en stock para ver'}
        />
        <StatCard label="Con financiación" value={ventasCuotas} sub={`de ${ventas.length} ventas en cuotas`} />
      </div>

      {/* Filters */}
      <div style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.08)' }}>
          <span style={{ color: '#6a717b', fontSize: 14 }}>⌕</span>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por cliente, equipo o IMEI…"
            style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 13.5 }} />
          {q && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', color: '#6a717b', cursor: 'pointer', fontSize: 15, padding: 0 }}>×</button>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginRight: 2 }}>Modalidad</span>
          {[['todas','Todas'],['contado','Contado'],['cuotas','Cuotas'],['apartado','Apartado']].map(([k, l]) => (
            <button key={k} onClick={() => setFiltroMod(k)} style={pill(filtroMod === k)}>{l}</button>
          ))}
          <div style={{ width: 1, height: 18, background: 'rgba(231,238,246,0.1)', margin: '0 4px' }} />
          <span style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginRight: 2 }}>Método</span>
          {metodos.map(m => (
            <button key={m} onClick={() => setFiltroMet(m)} style={pill(filtroMet === m)}>{m === 'todos' ? 'Todos' : m}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
          <span style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginRight: 2 }}>Período</span>
          <button onClick={() => setFiltroMes('todos')} style={pill(filtroMes === 'todos')}>Todos</button>
          {mesesDisp.map(k => (
            <button key={k} onClick={() => setFiltroMes(k)} style={pill(filtroMes === k)}>{mesLabel(k)}</button>
          ))}
          {anyFilter && (
            <button onClick={() => { setQ(''); setFiltroMod('todas'); setFiltroMet('todos'); setFiltroMes('todos'); }} style={{ ...pill(false), color: '#d98a76', background: 'rgba(217,138,118,0.08)', marginLeft: 6 }}>
              × Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Result count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ ...MONO(11), color: '#6a717b' }}>
          Mostrando {display.length} de {filtered.length} registros
          {!verTodas && !anyFilter && filtered.length > 10 && ' (últimos 10)'}
        </span>
        {filtered.length > 10 && !verTodas && (
          <button onClick={() => setVerTodas(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#74a8d6' }}>
            Ver todas las {filtered.length} ventas →
          </button>
        )}
        {verTodas && filtered.length > 10 && (
          <button onClick={() => setVerTodas(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#74a8d6' }}>
            Mostrar solo últimas 10 ↑
          </button>
        )}
      </div>

      {/* Table (scrollable en móvil) */}
      <div className="tbl-scroll">
      <div style={{ minWidth: 880 }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 14, padding: '0 16px 11px', borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
        {[['Fecha','left'],['Equipo','left'],['Cliente','left'],['Modalidad','left'],['Método','left'],['Precio / Ganancia','right'],['','right'],['','right']].map(([h, align], i) => (
          <span key={i} style={{ ...MONO(10, '#6a717b'), letterSpacing: 1.5, textTransform: 'uppercase', textAlign: align }}>{h}</span>
        ))}
      </div>

      {display.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: '#6a717b', fontSize: 14 }}>
          Sin ventas que coincidan con el filtro.
        </div>
      )}

      {display.map((v, i) => {
        const metC = METODO_COLORS[v.metodo] || METODO_COLORS['Efectivo'];
        const esNueva = i === 0 && v.id && v.id.startsWith('new_');
        const tcVenta = v.tc || tc;
        const ganancia = v.costo ? (v.usd - v.costo) : null;
        const margen = v.costo && v.costo > 0 ? Math.round(((v.usd - v.costo) / v.costo) * 100) : null;
        const vendedor = v.vendedorNumero ? vendedores.find(vd => vd.numero === v.vendedorNumero) : null;
        const tieneGarantia = !!v.garantiaUrl;
        const esMulti = v.lineas && v.lineas.length > 1;
        return (
          <div key={v.id} onClick={() => setDetalleVenta(v)} style={{ display: 'grid', gridTemplateColumns: cols, gap: 14, alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid rgba(231,238,246,0.05)', borderRadius: 10, background: esNueva ? 'rgba(116,168,214,0.04)' : 'none', cursor: 'pointer' }}>
            {/* Fecha */}
            <div style={{ ...MONO(12, '#828a94') }}>{v.fechaLabel}</div>

            {/* Equipo */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#eef2f7' }}>{v.equipo}</span>
                {esMulti && (
                  <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 5, background: 'rgba(116,168,214,0.12)', border: '1px solid rgba(116,168,214,0.3)', color: '#74a8d6', whiteSpace: 'nowrap' }}>
                    {v.lineas.length} productos
                  </span>
                )}
              </div>
              {v.imei && <div style={{ ...MONO(11, '#6a717b'), marginTop: 3, letterSpacing: 0.2 }}>{v.imei}</div>}
              {v.canje && v.canjeEquipo && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, padding: '2px 8px', borderRadius: 6, background: 'rgba(166,175,186,0.1)', border: '1px solid rgba(166,175,186,0.2)' }}>
                  <span style={{ fontSize: 10, color: '#a6afba' }}>↩</span>
                  <span style={{ fontSize: 11, color: '#a6afba' }}>{v.canjeEquipo}</span>
                </div>
              )}
            </div>

            {/* Cliente */}
            <div>
              <div style={{ fontSize: 13.5, color: '#a6afba' }}>{v.cliente}</div>
              {v.vendedorNumero && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, padding: '1px 7px', borderRadius: 5, background: 'rgba(155,147,214,0.1)', border: '1px solid rgba(155,147,214,0.25)' }}>
                  <span style={{ ...MONO(10, '#9b93d6') }}>#{v.vendedorNumero}</span>
                  {vendedor && <span style={{ fontSize: 11, color: '#9b93d6' }}>{vendedor.nombre}</span>}
                </div>
              )}
            </div>

            {/* Modalidad */}
            <div>
              {v.modalidad === 'contado' && !v.canje && (
                <span style={{ fontSize: 13, color: '#b6cdc1' }}>Contado · pago único</span>
              )}
              {v.modalidad === 'contado' && v.canje && (
                <div>
                  <span style={{ fontSize: 13, color: '#a6afba' }}>Contado + canje</span>
                  {v.canjeValor > 0 && <div style={{ fontSize: 11.5, color: '#82b39d', marginTop: 2 }}>Canje: {fUSD(v.canjeValor)}</div>}
                </div>
              )}
              {v.modalidad === 'cuotas' && (
                <div>
                  <div style={{ fontSize: 13, color: '#eef2f7', fontWeight: 500 }}>
                    {v.cuotas} cuotas{v.canje ? ' + canje' : ''}
                  </div>
                  {v.cuotaMonto > 0 && <div style={{ fontSize: 11.5, color: '#74a8d6', marginTop: 2 }}>{fUSD(v.cuotaMonto)} / mes</div>}
                  {v.anticipo > 0 && <div style={{ fontSize: 11, color: '#828a94', marginTop: 1 }}>Anticipo {fUSD(v.anticipo)}</div>}
                  {v.canje && v.canjeValor > 0 && <div style={{ fontSize: 11, color: '#82b39d', marginTop: 1 }}>Canje {fUSD(v.canjeValor)}</div>}
                </div>
              )}
              {v.modalidad === 'apartado' && (
                <div>
                  <span style={{ fontSize: 13, color: '#74a8d6' }}>Apartado · seña</span>
                  {v.anticipo > 0 && <div style={{ fontSize: 11.5, color: '#9ec6ec', marginTop: 2 }}>{fARS(v.anticipo)}</div>}
                </div>
              )}
            </div>

            {/* Método */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, ...metC, alignSelf: 'flex-start' }}>{v.metodo}</span>
              {v.canje && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(166,175,186,0.1)', color: '#a6afba', alignSelf: 'flex-start' }}>+ Canje</span>
              )}
            </div>

            {/* Precio / Ganancia */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#eef2f7', whiteSpace: 'nowrap' }}>{fUSD(v.usd)}</div>
              <div style={{ fontSize: 11, color: '#6a717b', marginTop: 1, whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
                {fARS(v.usd * tcVenta)} · TC {tcVenta.toLocaleString('es-AR')}
              </div>
              {ganancia !== null ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: ganancia >= 0 ? '#82b39d' : '#d98a76', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
                    {ganancia >= 0 ? '+' : ''}{fUSD(ganancia)}{margen !== null ? ` · ${margen}%` : ''}
                  </span>
                  <button onClick={e => { e.stopPropagation(); setEditingCosto(v.id); }} title="Editar costo" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5058', fontSize: 11, padding: 0, lineHeight: 1 }}>✎</button>
                </div>
              ) : (
                <button onClick={e => { e.stopPropagation(); setEditingCosto(v.id); }} style={{ fontSize: 11, color: '#4a5058', background: 'none', border: 'none', cursor: 'pointer', marginTop: 3, display: 'block', marginLeft: 'auto' }}>
                  + cargar costo
                </button>
              )}
            </div>

            {/* Garantía */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={e => { e.stopPropagation(); handleGarantiaClick(v); }}
                title={tieneGarantia ? `Ver garantía: ${v.garantiaNombre}` : 'Adjuntar garantía'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tieneGarantia ? '#82b39d' : '#6a717b', fontSize: 15 }}
              >
                {tieneGarantia ? '📎' : '○'}
              </button>
            </div>

            {/* Eliminar */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={e => { e.stopPropagation(); setDeletingVenta(v.id); }}
                title="Eliminar venta"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5058', fontSize: 14 }}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}

      </div>
      </div>

      {display.length > 0 && (
        <div style={{ ...MONO(11), marginTop: 14, textAlign: 'center', color: '#4a5058' }}>
          ○ = sin garantía adjunta · 📎 = garantía cargada · hacé clic para adjuntar o ver
        </div>
      )}
    </div>
  );
}
