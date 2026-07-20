import { useState, useEffect } from 'react';
import { getCatDef } from '../data/data.js';
import { fARS, fUSD } from '../lib/utils.js';
import { validateCuotas } from '../lib/validation.js';
import Modal from '../components/Modal.jsx';
import Paginacion from '../components/Paginacion.jsx';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });

// tc: tipo de cambio del día, recibido desde App para equivalencias en pesos
function ConvertirModal({ reserva, equipos, tc, negocios = [], miNegocioId = null, onConfirm, onClose }) {
  // La seña ya está en USD (congelada al TC del día en que se cobró)
  const saldoUSD       = Math.max(0, reserva.usd - reserva.sena);
  const saldoARS       = saldoUSD * tc;

  const [metodo, setMetodo]         = useState('Transferencia');
  const [modalidad, setModalidad]   = useState('contado');
  const [cuotas, setCuotas]         = useState(6);
  const [cuotasCustom, setCuotasCustom] = useState(false);
  const [anticipo, setAnticipo]     = useState('');
  const [primeraCuotaHoy, setPrimeraCuotaHoy] = useState(false);
  const [comision, setComision] = useState('');

  const equipoRef = reserva.equipoId ? equipos.find(e => e.id === reserva.equipoId) : null;
  // Equipo de otro negocio: al convertir corresponde capital + comisión manual al dueño
  const esAjeno = !!(equipoRef && miNegocioId && equipoRef.negocioId && equipoRef.negocioId !== miNegocioId);
  const nombreDuenio = esAjeno ? (negocios.find(n => n.id === equipoRef.negocioId)?.nombre || 'otro negocio') : '';
  const comNum = parseFloat(comision) || 0;

  const antNum      = parseFloat(anticipo || '0') || 0;
  const esCuotas    = modalidad === 'cuotas';
  const aFinanciar  = Math.max(0, saldoUSD - antNum);
  const cuotaMonto  = esCuotas && cuotas ? Math.round(aFinanciar / cuotas) : 0;

  const errors = (() => {
    const e = [];
    if (esCuotas) {
      const ec = validateCuotas(cuotas); if (ec) e.push(ec);
      if (antNum >= saldoUSD && saldoUSD > 0) e.push('El anticipo cubre todo el saldo — usá Contado en su lugar.');
      if (!ec && aFinanciar > 0 && cuotaMonto < 1)
        e.push('El monto por cuota da menos de US$ 1 — reducí la cantidad de cuotas.');
    }
    return e;
  })();
  const canConfirm = errors.length === 0;

  const iso3meses = () => { const d = new Date(); d.setMonth(d.getMonth() + 3); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const handleConfirm = () => {
    if (!canConfirm) return;
    const equipoLabel = [reserva.equipo, reserva.spec].filter(Boolean).join(' · ');
    onConfirm({
      equipoId:    reserva.equipoId || null,
      clienteId:   reserva.clienteId || null,
      equipo:      equipoLabel,
      imei:        equipoRef?.imei || '',
      categoria:   equipoRef?.categoria || '',
      cliente:     reserva.cliente,
      usd:         reserva.usd,
      costo:       equipoRef?.costo || null,
      tc,
      modalidad:   esCuotas ? 'cuotas' : 'contado',
      cuotas:      esCuotas ? cuotas : null,
      // La seña ya pagada se registra como parte del anticipo para que la venta cierre
      anticipo:    reserva.sena + (esCuotas ? antNum : 0),
      metodo,
      cuotaMonto:  esCuotas ? cuotaMonto : null,
      primeraCuotaHoy: esCuotas ? primeraCuotaHoy : false,
      canje:       false,
      canjeEquipo: null,
      canjeValor:  null,
      // Línea completa: capital + comisión al dueño y garantía por equipo
      // (equipo convertido → 3 meses por defecto; accesorio → sin garantía)
      lineas: equipoRef ? [{
        equipoId: equipoRef.id,
        equipo: equipoLabel,
        imei: equipoRef.imei || '',
        categoria: equipoRef.categoria || '',
        usd: reserva.usd,
        costo: equipoRef.costo || null,
        cantidad: 1,
        esRegalo: false,
        negocioDuenio: equipoRef.negocioId || null,
        comision: esAjeno ? comNum : 0,
        garantiaVence: getCatDef(equipoRef.categoria).enTabPropia ? iso3meses() : null,
        sinGarantia: !getCatDef(equipoRef.categoria).enTabPropia,
      }] : null,
    });
  };

  const MONO_L = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, color: '#6a717b', display: 'block' };
  const inputBase = { width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)', color: '#eef2f7', fontSize: 14 };

  return (
    <Modal title="Convertir reserva en venta" onClose={onClose} width={500}>
      {/* Resumen reserva */}
      <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(116,168,214,0.2)', background: 'rgba(116,168,214,0.05)', marginBottom: 22 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#eef2f7' }}>{reserva.equipo}</div>
        <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 2 }}>{reserva.spec}</div>
        {equipoRef?.imei && <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: '#6a717b', marginTop: 5, letterSpacing: 0.3 }}>IMEI {equipoRef.imei}</div>}
        <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Cliente</div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: '#eef2f7' }}>{reserva.cliente}</div>
          </div>
          <div>
            <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Precio total</div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: '#eef2f7' }}>{fUSD(reserva.usd)}</div>
          </div>
          <div>
            <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Seña ya pagada</div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: '#82b39d' }}>{fUSD(reserva.sena)}</div>
          </div>
          <div>
            <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Saldo pendiente</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#9ec6ec' }}>{fUSD(saldoUSD)} <span style={{ fontSize: 11, color: '#6a717b' }}>({fARS(saldoARS)})</span></div>
          </div>
        </div>
      </div>

      {/* Comisión al negocio dueño (equipo ajeno) */}
      {esAjeno && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, padding: '10px 14px', borderRadius: 10, background: 'rgba(217,184,118,0.06)', border: '1px solid rgba(217,184,118,0.25)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#d9b876' }}>Equipo de {nombreDuenio}</span>
          <span style={{ fontSize: 12, color: '#828a94' }}>· comisión US$</span>
          <input type="text" inputMode="decimal" value={comision} onChange={e => setComision(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0"
            style={{ width: 70, padding: '4px 9px', borderRadius: 6, background: 'rgba(231,238,246,0.05)', border: '1px solid rgba(217,184,118,0.3)', color: '#eef2f7', fontSize: 13 }} />
          {equipoRef.costo > 0 && <span style={{ fontSize: 11.5, color: '#6a717b' }}>+ capital {fUSD(equipoRef.costo)} al dueño</span>}
        </div>
      )}

      {/* Modalidad del saldo restante */}
      <div style={{ marginBottom: 18 }}>
        <span style={MONO_L}>¿Cómo paga el saldo?</span>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['contado','Contado','Pago único del saldo'],['cuotas','En cuotas','Financiación del saldo']].map(([k,t,sub]) => {
            const sel = modalidad === k;
            return (
              <button key={k} onClick={() => setModalidad(k)} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                <div style={{ padding: '12px 14px', borderRadius: 11, background: sel ? 'rgba(116,168,214,0.12)' : 'rgba(231,238,246,0.02)', border: `1px solid ${sel ? 'rgba(116,168,214,0.4)' : 'rgba(231,238,246,0.08)'}`, textAlign: 'left' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: sel ? '#eef2f7' : '#a6afba' }}>{t}</div>
                  <div style={{ fontSize: 11.5, color: sel ? '#93b8da' : '#6a717b', marginTop: 2 }}>{sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {modalidad === 'cuotas' && (
        <div style={{ marginBottom: 18, padding: 14, borderRadius: 12, border: '1px solid rgba(231,238,246,0.07)', background: 'rgba(231,238,246,0.015)' }}>
          <span style={MONO_L}>Cantidad de cuotas</span>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[3,6,9,12].map(n => (
              <button key={n} onClick={() => { setCuotas(n); setCuotasCustom(false); }} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                <div style={{ padding: '10px 0', borderRadius: 9, background: !cuotasCustom && cuotas === n ? '#74a8d6' : 'rgba(231,238,246,0.04)', color: !cuotasCustom && cuotas === n ? '#14171c' : '#a6afba', fontSize: 13.5, fontWeight: !cuotasCustom && cuotas === n ? 600 : 500, textAlign: 'center' }}>{n}</div>
              </button>
            ))}
            <button onClick={() => setCuotasCustom(true)} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
              <div style={{ padding: '10px 0', borderRadius: 9, background: cuotasCustom ? 'rgba(116,168,214,0.15)' : 'rgba(231,238,246,0.04)', color: cuotasCustom ? '#74a8d6' : '#a6afba', fontSize: 12, textAlign: 'center', border: cuotasCustom ? '1px solid rgba(116,168,214,0.4)' : 'none' }}>Otra</div>
            </button>
          </div>
          {cuotasCustom && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(116,168,214,0.3)', marginBottom: 12 }}>
              <input type="number" min="1" max="60" value={cuotas || ''} onChange={e => setCuotas(parseInt(e.target.value) || 0)} onWheel={e => e.target.blur()} placeholder="ej. 18" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 14 }} />
              <span style={{ fontSize: 13, color: '#828a94' }}>cuotas</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'rgba(116,168,214,0.06)', border: '1px solid rgba(116,168,214,0.15)' }}>
            <span style={{ fontSize: 13, color: '#a6afba' }}>Cuota mensual</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#9ec6ec' }}>{cuotas > 0 ? fUSD(cuotaMonto) : '—'}</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <span style={MONO_L}>Anticipo adicional (USD, opcional)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', ...inputBase }}>
              <span style={{ color: '#828a94' }}>US$</span>
              <input type="text" inputMode="decimal" value={anticipo} onChange={e => setAnticipo(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 14 }} />
            </div>
          </div>
          <button onClick={() => setPrimeraCuotaHoy(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 14px', marginTop: 12, borderRadius: 10, border: `1px solid ${primeraCuotaHoy ? 'rgba(130,179,157,0.5)' : 'rgba(231,238,246,0.09)'}`, background: primeraCuotaHoy ? 'rgba(130,179,157,0.08)' : 'rgba(231,238,246,0.02)', cursor: 'pointer' }}>
            <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${primeraCuotaHoy ? '#82b39d' : 'rgba(231,238,246,0.25)'}`, background: primeraCuotaHoy ? 'rgba(130,179,157,0.3)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {primeraCuotaHoy && <span style={{ fontSize: 10, color: '#eef2f7', fontWeight: 700 }}>✓</span>}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: primeraCuotaHoy ? '#eef2f7' : '#a6afba' }}>Primera cuota hoy</div>
              <div style={{ fontSize: 11, color: primeraCuotaHoy ? '#82b39d' : '#6a717b', marginTop: 1 }}>Se registra como cobrada · el resto arranca el mes que viene</div>
            </div>
          </button>
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <span style={MONO_L}>Método de pago</span>
        <div className="pay-methods">
          {['Transferencia','Débito','Crédito','Efectivo'].map(m => {
            const sel = metodo === m;
            return (
              <button key={m} onClick={() => setMetodo(m)} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                <div style={{ padding: '10px 6px', borderRadius: 10, background: sel ? 'rgba(116,168,214,0.14)' : 'rgba(231,238,246,0.03)', border: `1px solid ${sel ? 'rgba(116,168,214,0.45)' : 'rgba(231,238,246,0.08)'}`, color: sel ? '#eef2f7' : '#828a94', fontSize: 12.5, fontWeight: sel ? 600 : 500, textAlign: 'center' }}>{m}</div>
              </button>
            );
          })}
        </div>
      </div>

      {errors.length > 0 && (
        <div style={{ marginBottom: 14, padding: '10px 13px', borderRadius: 10, background: 'rgba(217,138,118,0.08)', border: '1px solid rgba(217,138,118,0.25)' }}>
          {errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: '#e6ab98', lineHeight: 1.7 }}>· {e}</div>)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: 11, border: '1px solid rgba(231,238,246,0.12)', background: 'none', color: '#a6afba', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={handleConfirm} disabled={!canConfirm} style={{ flex: 2, padding: 13, borderRadius: 11, border: '1px solid rgba(255,255,255,0.2)', background: canConfirm ? 'linear-gradient(160deg, #eef2f6, #b7c3ce)' : 'rgba(231,238,246,0.05)', color: canConfirm ? '#14171c' : '#6a717b', fontSize: 14, fontWeight: 600, cursor: canConfirm ? 'pointer' : 'default' }}>
          Confirmar venta · saldo {fUSD(saldoUSD)}
        </button>
      </div>
    </Modal>
  );
}

export default function Reservas({ reservas, equipos, tc, negocios, miNegocioId, onConvert, onCancelReserva, onDeleteReserva }) {
  const [q, setQ] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activa');
  const [convertiendo, setConvertiendo] = useState(null);
  const [cancelandoId, setCancelandoId] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 20;
  useEffect(() => { setPagina(1); }, [q, filtroEstado]);

  const qLow = q.trim().toLowerCase();
  const filtered = reservas.filter(r => {
    if (filtroEstado !== 'todas' && r.estado !== filtroEstado) return false;
    if (!qLow) return true;
    return (r.equipo + ' ' + r.spec + ' ' + r.cliente).toLowerCase().includes(qLow);
  });

  const activas = reservas.filter(r => r.estado === 'activa');
  const senasTot = activas.reduce((a, b) => a + b.sena, 0);

  const pill = (active) => ({
    padding: '5px 14px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer', border: 'none',
    fontFamily: "'Hanken Grotesk', sans-serif",
    background: active ? '#74a8d6' : 'rgba(231,238,246,0.06)',
    color: active ? '#14171c' : '#828a94', fontWeight: active ? 600 : 400,
  });

  return (
    <div>
      {convertiendo && (
        <ConvertirModal
          reserva={convertiendo}
          equipos={equipos}
          tc={tc}
          negocios={negocios}
          miNegocioId={miNegocioId}
          onConfirm={(ventaData) => { onConvert(convertiendo.id, ventaData); setConvertiendo(null); }}
          onClose={() => setConvertiendo(null)}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Apartados</div>
          <h1 className="page-title" style={{ whiteSpace: 'nowrap' }}>
            Equipos <span style={SERIF('inherit', '#9ec6ec')}>reservados</span>
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <div><div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>Activas</div><div style={{ fontSize: 19, fontWeight: 600 }}>{activas.length} <span style={{ fontSize: 13, color: '#828a94', fontWeight: 400 }}>de {reservas.length}</span></div></div>
          <div><div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>En señas</div><div style={{ fontSize: 19, fontWeight: 600, color: '#74a8d6', whiteSpace: 'nowrap' }}>{fUSD(senasTot)}</div></div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220, padding: '10px 14px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.08)' }}>
          <span style={{ color: '#6a717b', fontSize: 14 }}>⌕</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por equipo o cliente…" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 13.5 }} />
          {q && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', color: '#6a717b', cursor: 'pointer', fontSize: 15, padding: 0 }}>×</button>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['activa','Activas'],['convertida','Convertidas'],['cancelada','Canceladas'],['todas','Todas']].map(([k, l]) => (
            <button key={k} onClick={() => setFiltroEstado(k)} style={pill(filtroEstado === k)}>{l}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: '#6a717b', fontSize: 14 }}>Sin reservas que coincidan con el filtro.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map(r => {
          const pct = r.usd > 0 ? Math.round(r.sena / r.usd * 100) : 0;
          const equipoRef = r.equipoId ? equipos.find(e => e.id === r.equipoId) : null;
          const esActiva = r.estado === 'activa';
          const esCancelada = r.estado === 'cancelada';
          const accentColor = esActiva ? '#82b39d' : esCancelada ? '#d98a76' : '#6a717b';
          const borderColor = esActiva ? 'rgba(130,179,157,0.2)' : esCancelada ? 'rgba(217,138,118,0.15)' : 'rgba(231,238,246,0.08)';
          const confirmando = cancelandoId === r.id;
          return (
            <div key={r.id} className="rg-reserva" style={{ position: 'relative', padding: '22px 24px 22px 28px', borderRadius: 16, border: `1px solid ${borderColor}`, background: '#181b20', overflow: 'hidden', opacity: esActiva ? 1 : 0.6 }}>
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: accentColor }} />
              <div>
                <div style={{ fontSize: 16.5, fontWeight: 600, color: '#eef2f7' }}>{r.equipo}</div>
                <div style={{ fontSize: 13, color: '#828a94', marginTop: 2 }}>{r.spec}</div>
                {equipoRef?.imei && <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: '#6a717b', marginTop: 5, letterSpacing: 0.3 }}>IMEI {equipoRef.imei}</div>}
                <div style={{ fontSize: 13, color: '#a6afba', marginTop: 9 }}>Reservado por <span style={{ color: '#eef2f7', fontWeight: 500 }}>{r.cliente}</span></div>
              </div>
              <div>
                <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>Seña</div>
                <div style={SERIF(25, '#9ec6ec')}>{fUSD(r.sena)}</div>
                <div style={{ fontSize: 12, color: '#828a94', marginTop: 5 }}>{pct}% del total · {fUSD(r.usd)}</div>
                <div style={{ fontSize: 12, color: '#74a8d6', marginTop: 3 }}>Saldo: {fUSD(Math.max(0, r.usd - r.sena))} <span style={{ color: '#6a717b' }}>(≈ {fARS(Math.max(0, r.usd - r.sena) * tc)})</span></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  {esActiva    && <span style={{ fontSize: 12, color: '#b6cdc1', padding: '4px 11px', borderRadius: 20, background: 'rgba(130,179,157,0.13)' }}>Activa</span>}
                  {esCancelada && <span style={{ fontSize: 12, color: '#d98a76', padding: '4px 11px', borderRadius: 20, background: 'rgba(217,138,118,0.1)' }}>Cancelada</span>}
                  {!esActiva && !esCancelada && <span style={{ fontSize: 12, color: '#a6afba', padding: '4px 11px', borderRadius: 20, background: 'rgba(231,238,246,0.06)' }}>Convertida</span>}
                  <span style={{ ...MONO(12, '#a6afba') }}>Reservado {r.fecha}</span>
                </div>
                {esActiva && !confirmando && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setCancelandoId(r.id)}
                      style={{ fontSize: 12, fontWeight: 500, color: '#d98a76', background: 'rgba(217,138,118,0.08)', border: '1px solid rgba(217,138,118,0.25)', padding: '7px 12px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Cancelar reserva
                    </button>
                    <button onClick={() => setConvertiendo(r)} style={{ fontSize: 13, fontWeight: 600, color: '#14171c', background: 'linear-gradient(160deg, #eef2f6, #b7c3ce)', padding: '8px 15px', borderRadius: 10, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap', boxShadow: '0 4px 12px -6px rgba(200,220,240,0.5)' }}>Convertir en venta →</button>
                  </div>
                )}
                {esActiva && confirmando && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
                    <span style={{ fontSize: 12, color: '#d98a76' }}>¿Confirmar cancelación?{r.equipoId ? ' El equipo vuelve al stock.' : ''}</span>
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button onClick={() => setCancelandoId(null)} style={{ fontSize: 12, color: '#a6afba', background: 'none', border: '1px solid rgba(231,238,246,0.15)', padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>No</button>
                      <button
                        onClick={() => { onCancelReserva(r.id, r.equipoId); setCancelandoId(null); }}
                        style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#c0655a', border: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}
                      >
                        Sí, cancelar
                      </button>
                    </div>
                  </div>
                )}
                {!esActiva && !esCancelada && <span style={{ fontSize: 13, fontWeight: 500, color: '#82b39d', whiteSpace: 'nowrap' }}>✓ Entregado al cliente</span>}
                {esCancelada && <span style={{ fontSize: 13, color: '#6a717b', whiteSpace: 'nowrap' }}>Reserva no concretada</span>}
                {/* Eliminar para cualquier estado */}
                {pendingDeleteId === r.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
                    <span style={{ fontSize: 12, color: '#d98a76' }}>¿Eliminar registro de esta reserva?</span>
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button onClick={() => setPendingDeleteId(null)} style={{ fontSize: 12, color: '#a6afba', background: 'none', border: '1px solid rgba(231,238,246,0.15)', padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>No</button>
                      <button onClick={() => { onDeleteReserva(r.id, esActiva ? r.equipoId : null); setPendingDeleteId(null); }}
                        style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#c0655a', border: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>
                        Sí, eliminar
                      </button>
                    </div>
                  </div>
                ) : !confirmando && (
                  <button onClick={() => setPendingDeleteId(r.id)}
                    style={{ fontSize: 11.5, color: '#6a717b', background: 'none', border: '1px solid rgba(231,238,246,0.1)', padding: '5px 10px', borderRadius: 7, cursor: 'pointer' }}>
                    Eliminar registro
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Paginacion total={filtered.length} pagina={pagina} porPagina={POR_PAGINA} onCambio={setPagina} />
    </div>
  );
}
