import { useState } from 'react';
import { TODAY, MONTH_ABBR, DAY_NAMES, fARS, fUSD, dnum } from '../lib/utils.js';
import { esPhone } from '../data/data.js';

const C = {
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: '#828a94', textTransform: 'uppercase' },
  card: { padding: '26px 28px', borderRadius: 20, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20' },
  serif: (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color }),
  mono: (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color }),
};

const todayNum = dnum(TODAY);

function dayNum(offset = 0) {
  const d = new Date(TODAY.y, TODAY.m - 1, TODAY.d + offset);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export default function Resumen({ equipos, ventas, cobros, reservas, tc, onUpdateTC, onGoCobros }) {
  const [tcEdit, setTcEdit] = useState(false);
  const [tcInput, setTcInput] = useState('');

  const disp = equipos.filter(e => e.estado === 'disponible');
  const unidades = (arr) => arr.reduce((a, e) => a + (e.cantidad || 1), 0);
  const unidadesDisp = unidades(disp);
  // Total = unidades físicas en el local (disponibles + reservadas); lo vendido no cuenta
  const unidadesTot = unidades(equipos.filter(e => e.estado !== 'vendido'));
  const stockNuevos = unidades(disp.filter(e => e.cond === 'Nuevo'));
  const stockUsados = unidadesDisp - stockNuevos;

  // Ventas de hoy
  const ventasHoy = ventas.filter(v => v.fechaNum === todayNum);
  const ventasHoyUSD = ventasHoy.reduce((a, b) => a + b.usd, 0);

  // Sparkline: últimos 7 días
  const spark = Array.from({ length: 7 }, (_, i) => {
    const n = dayNum(i - 6);
    return ventas.filter(v => v.fechaNum === n).reduce((a, b) => a + b.usd, 0);
  });
  const sparkMax = Math.max(...spark, 1);
  const sparkBars = spark.map((v, i) => ({ h: Math.round((v / sparkMax) * 54) + 8, hot: i === 6 }));

  // Reservas
  const reservasActivas = reservas.filter(r => r.estado === 'activa');
  const reservasSenasTot = reservasActivas.reduce((a, b) => a + b.sena, 0);

  // Cobros del mes
  const cobMes = cobros.filter(c => c.y === TODAY.y && c.m === TODAY.m);
  const sumEst = (st) => cobMes.filter(c => c.estado === st).reduce((a, b) => a + b.monto, 0);
  const totPorCobrar = sumEst('pendiente');
  const totVencido   = sumEst('vencida');
  const totCobrado   = sumEst('cobrada');
  const totAll       = totPorCobrar + totVencido + totCobrado || 1;

  // Cobros próximos (pendientes desde hoy)
  const cobrosProx = cobros
    .filter(c => c.estado === 'pendiente' && dnum(c) >= todayNum)
    .sort((a, b) => dnum(a) - dnum(b))
    .slice(0, 5);

  // Requiere atención
  const cobrosVencidos = cobros.filter(c => c.estado === 'vencida');
  const montoVencido = cobrosVencidos.reduce((a, b) => a + b.monto, 0);
  const equiposBatBaja = disp.filter(e => esPhone(e.categoria) && e.bat !== null && e.bat < 80);
  // Garantías vencen en los próximos 30 días
  const en30 = dayNum(30);
  // Garantías por vencer: por equipo (cada teléfono tiene la suya)
  const garProximas = [];
  for (const v of ventas) {
    for (const l of (v.lineas || [])) {
      if (l.sinGarantia || !l.garantiaVence) continue;
      const n = Number(l.garantiaVence.replace(/-/g, ''));
      if (n >= todayNum && n <= en30) garProximas.push({ cliente: v.cliente, equipo: l.equipo });
    }
  }

  const alertas = [
    cobrosVencidos.length > 0 && {
      dot: '#d98a76',
      titulo: `${cobrosVencidos.length} cuota${cobrosVencidos.length > 1 ? 's' : ''} vencida${cobrosVencidos.length > 1 ? 's' : ''} sin cobrar`,
      detalle: `${fUSD(montoVencido)} pendientes · gestioná en Agenda`,
    },
    garProximas.length > 0 && {
      dot: '#9b93d6',
      titulo: `${garProximas.length} garantía${garProximas.length > 1 ? 's' : ''} vence${garProximas.length > 1 ? 'n' : ''} en los próximos 30 días`,
      detalle: [...new Set(garProximas.map(g => g.cliente))].join(', '),
    },
    equiposBatBaja.length > 0 && {
      dot: '#74a8d6',
      titulo: `${equiposBatBaja.length} equipo${equiposBatBaja.length > 1 ? 's' : ''} con batería baja en stock`,
      detalle: equiposBatBaja.map(e => `${e.modelo} (${e.bat}%)`).slice(0, 3).join(' · '),
    },
  ].filter(Boolean);

  const todayDayName = DAY_NAMES[(new Date(TODAY.y, TODAY.m - 1, TODAY.d).getDay() + 6) % 7];
  const mesNombre = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][TODAY.m - 1];

  return (
    <div>
      <div className="page-head" style={{ marginBottom: 30 }}>
        <div>
          <div style={{ ...C.label, marginBottom: 9 }}>{todayDayName} {TODAY.d} de {mesNombre} · {TODAY.y}</div>
          <h1 className="page-title">
            {ventasHoy.length > 0
              ? <>Hoy <span style={C.serif('inherit', '#9ec6ec')}>{ventasHoy.length} venta{ventasHoy.length > 1 ? 's' : ''}</span> registradas.</>
              : <>Buenas, todo <span style={C.serif('inherit', '#9ec6ec')}>en orden</span> hoy.</>
            }
          </h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 30, border: '1px solid rgba(130,179,157,0.3)', background: 'rgba(130,179,157,0.08)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#82b39d', boxShadow: '0 0 0 3px rgba(130,179,157,0.18)', display: 'inline-block' }} />
            <span style={{ fontSize: 13, color: '#b6cdc1' }}>Caja abierta</span>
          </div>
          {/* Editor de TC del día */}
          {tcEdit ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...C.mono(10), letterSpacing: 1.5, textTransform: 'uppercase' }}>TC $</span>
              <input
                autoFocus
                type="number"
                value={tcInput}
                onChange={e => setTcInput(e.target.value)}
                onWheel={e => e.target.blur()}
                onKeyDown={e => {
                  if (e.key === 'Enter') { onUpdateTC(tcInput); setTcEdit(false); }
                  if (e.key === 'Escape') setTcEdit(false);
                }}
                onBlur={() => { if (tcInput) onUpdateTC(tcInput); setTcEdit(false); }}
                style={{ width: 88, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(116,168,214,0.4)', background: '#1e2228', color: '#eef2f7', fontSize: 13, textAlign: 'right' }}
              />
              <button onClick={() => setTcEdit(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a717b', fontSize: 13 }}>✕</button>
            </div>
          ) : (
            <button onClick={() => { setTcInput(String(tc)); setTcEdit(true); }} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(231,238,246,0.1)', background: 'rgba(231,238,246,0.03)', cursor: 'pointer', color: '#828a94', fontSize: 12.5 }}>
              <span>TC del día</span>
              <span style={{ ...C.mono(12.5, '#a6afba') }}>${tc.toLocaleString('es-AR')}</span>
              <span style={{ fontSize: 10, color: '#6a717b' }}>✏</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 1 */}
      <div className="rg-main" style={{ marginBottom: 16 }}>
        {/* Ventas de hoy */}
        <div style={{ position: 'relative', overflow: 'hidden', padding: '30px 32px', borderRadius: 20, border: '1px solid rgba(116,168,214,0.22)', background: 'linear-gradient(155deg, rgba(116,168,214,0.10), rgba(30,34,40,0.4) 60%)' }}>
          <div style={{ position: 'absolute', top: -60, right: -40, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(116,168,214,0.16), transparent 70%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <span style={{ ...C.mono(11, '#93b8da'), letterSpacing: 2, textTransform: 'uppercase' }}>Ventas de hoy</span>
            {ventasHoy.length > 0 && (
              <span style={{ fontSize: 12.5, color: '#82b39d', fontWeight: 500 }}>{ventasHoy.length} operación{ventasHoy.length > 1 ? 'es' : ''}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 16, position: 'relative' }}>
            <span style={{ ...C.serif('clamp(42px, 11vw, 62px)', '#f6f9fc'), lineHeight: 0.9, whiteSpace: 'nowrap' }}>
              {ventasHoy.length > 0 ? fUSD(ventasHoyUSD) : <span style={{ color: '#4a5058' }}>US$ —</span>}
            </span>
          </div>
          <div style={{ marginTop: 16, fontSize: 14.5, color: '#a6afba', position: 'relative' }}>
            {ventasHoy.length > 0
              ? <>equivale a <span style={{ color: '#eef2f7', fontWeight: 500 }}>{fARS(ventasHoyUSD * tc)}</span></>
              : 'Sin ventas registradas todavía hoy.'
            }
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 64, marginTop: 24, position: 'relative' }}>
            {sparkBars.map((bar, i) => (
              <div key={i} style={{ flex: 1, borderRadius: '4px 4px 2px 2px', height: bar.h, background: bar.hot ? 'linear-gradient(180deg, #9ec6ec, #5f8fb8)' : 'rgba(231,238,246,0.10)' }} />
            ))}
          </div>
        </div>

        {/* Stock + Reservas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ flex: 1, ...C.card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={C.label}>Stock disponible</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 11, marginTop: 14 }}>
              <span style={{ fontSize: 46, fontWeight: 600, letterSpacing: -1 }}>{unidadesDisp}</span>
              <span style={{ fontSize: 14, color: '#828a94' }}>de {unidadesTot} unidades</span>
            </div>
            <div style={{ fontSize: 13, color: '#a6afba', marginTop: 8 }}>{stockNuevos} nuevos · {stockUsados} usados</div>
          </div>
          <div style={{ flex: 1, ...C.card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={C.label}>Reservas activas</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 11, marginTop: 14 }}>
              <span style={{ fontSize: 46, fontWeight: 600, letterSpacing: -1 }}>{reservasActivas.length}</span>
              {reservasSenasTot > 0 && <span style={{ fontSize: 14, color: '#828a94' }}>{fUSD(reservasSenasTot)} en señas</span>}
            </div>
            <div style={{ fontSize: 13, color: '#a6afba', marginTop: 8 }}>
              {reservasActivas.length === 0 ? 'Sin apartados activos' : 'Seña a cuenta · sin vencimiento'}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="rg-main" style={{ marginBottom: 16 }}>
        <div style={C.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={C.label}>Cobros próximos</span>
            <button onClick={onGoCobros} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#74a8d6' }}>Ver agenda →</button>
          </div>
          {cobrosProx.length === 0 ? (
            <div style={{ padding: '20px 0', color: '#6a717b', fontSize: 13.5, textAlign: 'center' }}>Sin cobros pendientes próximos.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {cobrosProx.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 0', borderTop: '1px solid rgba(231,238,246,0.06)' }}>
                  <div style={{ width: 50, flexShrink: 0, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1 }}>{c.d}</div>
                    <div style={{ ...C.mono(9), letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{MONTH_ABBR[c.m - 1]}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 500, color: '#eef2f7' }}>{c.cliente}</div>
                    <div style={{ fontSize: 12.5, color: '#828a94', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.equipo}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{fUSD(c.monto)}</div>
                    <div style={{ ...C.mono(10, '#93b8da'), letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Cuota</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ ...C.card, display: 'flex', flexDirection: 'column' }}>
          <span style={{ ...C.label, marginBottom: 20 }}>El mes en cobros</span>
          {cobMes.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a717b', fontSize: 13.5 }}>Sin cobros este mes.</div>
          ) : (
            <>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, color: '#a6afba' }}>Por cobrar</div>
                <div style={C.serif(38, '#9ec6ec')}>{fUSD(totPorCobrar)}</div>
              </div>
              <div style={{ display: 'flex', height: 8, borderRadius: 8, overflow: 'hidden', marginBottom: 18, background: 'rgba(231,238,246,0.06)' }}>
                <div style={{ width: `${(totCobrado / totAll) * 100}%`, background: '#82b39d' }} />
                <div style={{ width: `${(totVencido / totAll) * 100}%`, background: '#d98a76' }} />
                <div style={{ width: `${(totPorCobrar / totAll) * 100}%`, background: '#74a8d6' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[['#82b39d', 'Cobrado', totCobrado], ['#d98a76', 'Vencido', totVencido]].map(([color, label, val]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: color, display: 'inline-block' }} />
                      <span style={{ fontSize: 13.5, color: '#a6afba' }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>{fUSD(val)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 3 */}
      <div className="rg-main">
        {/* Actividad de hoy */}
        <div style={C.card}>
          <span style={C.label}>Actividad de hoy</span>
          {ventasHoy.length === 0 ? (
            <div style={{ padding: '28px 0', color: '#6a717b', fontSize: 13.5, textAlign: 'center' }}>Sin ventas registradas hoy.</div>
          ) : (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column' }}>
              {ventasHoy.map((v) => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderTop: '1px solid rgba(231,238,246,0.06)' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 500 }}>{v.equipo}</span>
                    <span style={{ fontSize: 13, color: '#828a94' }}> — {v.cliente}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#93b8da', fontWeight: 500, padding: '3px 9px', borderRadius: 20, border: '1px solid rgba(116,168,214,0.25)', whiteSpace: 'nowrap' }}>
                    {v.modalidad === 'cuotas' ? `${v.cuotas} cuotas` : v.modalidad === 'apartado' ? 'Apartado' : 'Contado'}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 600, width: 84, textAlign: 'right', whiteSpace: 'nowrap' }}>{fUSD(v.usd)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Requiere atención */}
        <div style={{ padding: '26px 28px', borderRadius: 20, border: `1px solid ${alertas.length > 0 ? 'rgba(217,138,118,0.22)' : 'rgba(231,238,246,0.08)'}`, background: alertas.length > 0 ? 'linear-gradient(160deg, rgba(217,138,118,0.07), #181b20 60%)' : '#181b20' }}>
          <span style={{ ...C.label, color: alertas.length > 0 ? '#d98a76' : '#828a94' }}>Requiere atención</span>
          {alertas.length === 0 ? (
            <div style={{ marginTop: 20, color: '#82b39d', fontSize: 14 }}>✓ Todo en orden por ahora.</div>
          ) : (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {alertas.map((x, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ marginTop: 5, width: 6, height: 6, borderRadius: '50%', background: x.dot, flexShrink: 0, display: 'inline-block' }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#eef2f7' }}>{x.titulo}</div>
                    <div style={{ fontSize: 12.5, color: '#9aa2ad', marginTop: 1 }}>{x.detalle}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
