import { useState } from 'react';
import { fUSD } from '../lib/utils.js';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });

function isoHoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const labelDe = (iso) => iso ? iso.split('-').reverse().join('/') : '';

const input = {
  padding: '8px 11px', borderRadius: 9, background: '#1e2228',
  border: '1px solid rgba(231,238,246,0.12)', color: '#eef2f7', fontSize: 13,
  fontFamily: "'Hanken Grotesk', sans-serif", colorScheme: 'dark',
};
const btn = (color, solid = false) => ({
  padding: '6px 14px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer', fontWeight: 600,
  fontFamily: "'Hanken Grotesk', sans-serif",
  border: `1px solid ${color}55`, background: solid ? color : `${color}14`,
  color: solid ? '#14171c' : color,
});

export default function CuentaCorrienteModal({ negocio, miNegocioId, comisiones, movimientos, onSetPagado, onSaldarTodo, onCrearMovimiento, onBorrarMovimiento, onClose }) {
  const [filtro, setFiltro] = useState('pendientes');
  const [confirmSaldar, setConfirmSaldar] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [dir, setDir] = useState('meDebe');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(isoHoy());
  const [error, setError] = useState('');

  // Solo las operaciones entre mi negocio y esta contraparte
  const esPar = (a, b) => (a === negocio.id && b === miNegocioId) || (a === miNegocioId && b === negocio.id);

  const items = [
    ...comisiones
      .filter(c => esPar(c.negocioDuenio, c.negocioVendedor))
      .map(c => ({
        tipo: 'comision', id: c.id, fechaNum: c.fechaNum, fechaLabel: c.fechaLabel,
        concepto: c.equipo,
        detalle: [c.capital > 0 ? `capital ${fUSD(c.capital)}` : '', c.monto > 0 ? `com. ${fUSD(c.monto)}` : ''].filter(Boolean).join(' + '),
        total: c.monto + c.capital,
        soyAcreedor: c.negocioDuenio === miNegocioId,
        pagado: c.pagado, pagadoEn: c.pagadoEn, borrable: false,
      })),
    ...movimientos
      .filter(m => esPar(m.negocioDeudor, m.negocioAcreedor))
      .map(m => ({
        tipo: 'movimiento', id: m.id, fechaNum: m.fechaNum, fechaLabel: m.fechaLabel,
        concepto: m.concepto, detalle: 'movimiento manual',
        total: m.monto,
        soyAcreedor: m.negocioAcreedor === miNegocioId,
        pagado: m.pagado, pagadoEn: m.pagadoEn,
        borrable: m.creadoPor === miNegocioId && !m.pagado,
      })),
  ].sort((a, b) => b.fechaNum - a.fechaNum);

  const pendientes = items.filter(i => !i.pagado);
  const saldo = pendientes.reduce((a, i) => a + (i.soyAcreedor ? i.total : -i.total), 0);
  const aMiFavor = pendientes.filter(i => i.soyAcreedor);
  const visibles = filtro === 'todas' ? items : items.filter(i => filtro === 'pendientes' ? !i.pagado : i.pagado);

  const submitMovimiento = () => {
    const m = parseFloat(monto);
    if (!concepto.trim()) { setError('Poné un concepto (ej: Calefactor 50/50)'); return; }
    if (!m || m <= 0) { setError('El monto debe ser mayor a 0'); return; }
    setError('');
    onCrearMovimiento({
      fecha,
      concepto: concepto.trim(),
      monto: Math.round(m * 100) / 100,
      negocioDeudor: dir === 'meDebe' ? negocio.id : miNegocioId,
      negocioAcreedor: dir === 'meDebe' ? miNegocioId : negocio.id,
    });
    setConcepto(''); setMonto(''); setFecha(isoHoy()); setShowForm(false);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,12,15,0.75)', backdropFilter: 'blur(3px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 680, maxHeight: '88vh', overflowY: 'auto', background: '#181b20', borderRadius: 18, border: '1px solid rgba(231,238,246,0.1)', padding: '24px 26px' }}>

        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
          <div>
            <div style={{ ...MONO(10), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 7 }}>Cuenta corriente</div>
            <div style={{ ...SERIF(26), lineHeight: 1.1 }}>{negocio.nombre}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#828a94', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ marginBottom: 18 }}>
          <span style={{ ...SERIF(22, saldo > 0 ? '#82b39d' : saldo < 0 ? '#d98a76' : '#828a94') }}>
            {saldo > 0 ? `te debe ${fUSD(saldo)}` : saldo < 0 ? `le debés ${fUSD(-saldo)}` : 'están al día'}
          </span>
          {pendientes.length > 0 && <span style={{ fontSize: 12, color: '#6a717b', marginLeft: 10 }}>{pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}</span>}
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <button onClick={() => { setShowForm(!showForm); setError(''); }} style={btn('#74a8d6')}>
            {showForm ? 'Cancelar' : '+ Agregar movimiento'}
          </button>
          {aMiFavor.length > 0 && !confirmSaldar && (
            <button onClick={() => setConfirmSaldar(true)} style={btn('#82b39d')}>
              Saldar todo ({aMiFavor.length})
            </button>
          )}
          {confirmSaldar && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#d9b876', flexWrap: 'wrap' }}>
              ¿Marcar {aMiFavor.length} línea{aMiFavor.length !== 1 ? 's' : ''} como pagada{aMiFavor.length !== 1 ? 's' : ''}?
              <button onClick={() => { onSaldarTodo(aMiFavor.map(i => ({ tipo: i.tipo, id: i.id }))); setConfirmSaldar(false); }} style={btn('#82b39d', true)}>Sí, saldar</button>
              <button onClick={() => setConfirmSaldar(false)} style={btn('#828a94')}>No</button>
            </span>
          )}
        </div>

        {/* Form de movimiento manual */}
        {showForm && (
          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(116,168,214,0.05)', border: '1px solid rgba(116,168,214,0.2)', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {[['meDebe', `${negocio.nombre} me debe`], ['leDebo', `le debo a ${negocio.nombre}`]].map(([k, label]) => (
                <button key={k} onClick={() => setDir(k)}
                  style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer', border: 'none', fontFamily: "'Hanken Grotesk', sans-serif", background: dir === k ? (k === 'meDebe' ? '#82b39d' : '#d98a76') : 'rgba(231,238,246,0.06)', color: dir === k ? '#14171c' : '#828a94', fontWeight: dir === k ? 600 : 400 }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Concepto (ej: Calefactor 50/50)" style={{ ...input, flex: 1, minWidth: 180 }} />
              <span style={{ fontSize: 12.5, color: '#828a94' }}>US$</span>
              <input value={monto} onChange={e => setMonto(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0" style={{ ...input, width: 80 }} />
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={input} />
              <button onClick={submitMovimiento} style={btn('#74a8d6', true)}>Registrar</button>
            </div>
            {error && <div style={{ marginTop: 8, fontSize: 12.5, color: '#d98a76' }}>{error}</div>}
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[['pendientes', 'Pendientes'], ['pagadas', 'Pagadas'], ['todas', 'Todas']].map(([k, label]) => (
            <button key={k} onClick={() => setFiltro(k)}
              style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: "'Hanken Grotesk', sans-serif", background: filtro === k ? '#74a8d6' : 'rgba(231,238,246,0.06)', color: filtro === k ? '#14171c' : '#828a94', fontWeight: filtro === k ? 600 : 400 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {visibles.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#6a717b', fontSize: 13 }}>
            Sin operaciones {filtro === 'pendientes' ? 'pendientes' : filtro === 'pagadas' ? 'pagadas' : ''} con {negocio.nombre}.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibles.map(i => (
            <div key={`${i.tipo}-${i.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '9px 12px', borderRadius: 10, background: 'rgba(231,238,246,0.02)', border: '1px solid rgba(231,238,246,0.06)', opacity: i.pagado ? 0.65 : 1 }}>
              <span style={{ ...MONO(11), flexShrink: 0 }}>{i.fechaLabel}</span>
              <span style={{ flex: 1, minWidth: 140, fontSize: 13, color: '#eef2f7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {i.concepto}
                <span style={{ color: '#6a717b', fontSize: 11.5, marginLeft: 8 }}>{i.detalle}</span>
              </span>
              <span style={{ fontWeight: 600, fontSize: 13.5, color: i.soyAcreedor ? '#82b39d' : '#d98a76', whiteSpace: 'nowrap' }}>
                {i.soyAcreedor ? '+' : '−'}{fUSD(i.total)}
              </span>
              {i.pagado ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: '#82b39d' }}>✓ Pagada el {labelDe(i.pagadoEn)}</span>
                  {i.soyAcreedor && (
                    <button onClick={() => onSetPagado(i.tipo, i.id, false)} style={{ ...btn('#828a94'), padding: '3px 9px', fontSize: 11 }}>Desmarcar</button>
                  )}
                </span>
              ) : i.soyAcreedor ? (
                <button onClick={() => onSetPagado(i.tipo, i.id, true)} style={{ ...btn('#82b39d'), padding: '4px 11px', fontSize: 11.5 }}>Marcar pagada</button>
              ) : (
                <span style={{ fontSize: 11, color: '#d9b876' }}>pendiente</span>
              )}
              {i.borrable && (
                <button onClick={() => onBorrarMovimiento(i.id)} title="Eliminar movimiento" style={{ background: 'none', border: 'none', color: '#d98a76', cursor: 'pointer', fontSize: 14, padding: 2 }}>🗑</button>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: '#6a717b' }}>
          Los pagos los confirma solo el que cobra. Las comisiones se saldan con capital y comisión juntos; para corregir un movimiento manual, borralo y cargalo de nuevo.
        </div>
      </div>
    </div>
  );
}
