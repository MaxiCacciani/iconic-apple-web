import { COBROS, RESERVAS, ACTIVIDAD, SPARK_RAW, TODAY, MONTH_ABBR, DAY_NAMES, fARS, fUSD, dnum } from '../data/data.js';

const C = {
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: '#828a94', textTransform: 'uppercase' },
  card: { padding: '26px 28px', borderRadius: 20, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20' },
  serif: (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color }),
  mono: (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color }),
};

export default function Resumen({ equipos, onGoCobros }) {
  const tc = 1400;
  const disp = equipos.filter(e => e.estado === 'disponible');
  const stockNuevos = disp.filter(e => e.cond === 'Nuevo').length;
  const stockUsados = disp.length - stockNuevos;
  const ventasUSD = ACTIVIDAD.reduce((a, b) => a + b.usd, 0);
  const sparkMax = Math.max(...SPARK_RAW);
  const spark = SPARK_RAW.map((v, i) => ({ h: Math.round((v / sparkMax) * 54) + 8, hot: i === SPARK_RAW.length - 1 }));

  const reservasActivas = RESERVAS.filter(r => r.estado === 'activa');
  const reservasSenasTot = reservasActivas.reduce((a, b) => a + b.sena, 0);

  const juneCob = COBROS.filter(c => c.y === 2026 && c.m === 6);
  const jSum = (st) => juneCob.filter(c => c.estado === st).reduce((a, b) => a + b.monto, 0);
  const totPorCobrar = jSum('pendiente'), totVencido = jSum('vencida'), totCobrado = jSum('cobrada');
  const totAll = totPorCobrar + totVencido + totCobrado || 1;

  const tToday = dnum(TODAY);
  const cobrosProx = COBROS.filter(c => c.estado === 'pendiente' && dnum(c) >= tToday)
    .sort((a, b) => dnum(a) - dnum(b)).slice(0, 5);

  const todayDayName = DAY_NAMES[(new Date(TODAY.y, TODAY.m - 1, TODAY.d).getDay() + 6) % 7];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 30 }}>
        <div>
          <div style={{ ...C.label, marginBottom: 9 }}>{todayDayName} {TODAY.d} de {['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][TODAY.m-1]} · {TODAY.y}</div>
          <h1 style={{ margin: 0, fontSize: 33, fontWeight: 600, letterSpacing: -0.5 }}>
            Buenas, todo <span style={C.serif(33, '#9ec6ec')}>en orden</span> hoy.
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 30, border: '1px solid rgba(130,179,157,0.3)', background: 'rgba(130,179,157,0.08)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#82b39d', boxShadow: '0 0 0 3px rgba(130,179,157,0.18)', display: 'inline-block' }} />
          <span style={{ fontSize: 13, color: '#b6cdc1' }}>Caja abierta</span>
        </div>
      </div>

      {/* Row 1: Ventas + Stock/Reservas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Ventas de hoy */}
        <div style={{ position: 'relative', overflow: 'hidden', padding: '30px 32px', borderRadius: 20, border: '1px solid rgba(116,168,214,0.22)', background: 'linear-gradient(155deg, rgba(116,168,214,0.10), rgba(30,34,40,0.4) 60%)' }}>
          <div style={{ position: 'absolute', top: -60, right: -40, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(116,168,214,0.16), transparent 70%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <span style={{ ...C.mono(11, '#93b8da'), letterSpacing: 2, textTransform: 'uppercase' }}>Ventas de hoy</span>
            <span style={{ fontSize: 12.5, color: '#82b39d', fontWeight: 500 }}>+18% vs ayer</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 16, position: 'relative' }}>
            <span style={{ ...C.serif(62, '#f6f9fc'), lineHeight: 0.9, whiteSpace: 'nowrap' }}>{fUSD(ventasUSD)}</span>
          </div>
          <div style={{ marginTop: 16, fontSize: 14.5, color: '#a6afba', position: 'relative' }}>
            {ACTIVIDAD.length} operaciones · equivalen a <span style={{ color: '#eef2f7', fontWeight: 500 }}>{fARS(ventasUSD * tc)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 64, marginTop: 24, position: 'relative' }}>
            {spark.map((bar, i) => (
              <div key={i} style={{ flex: 1, borderRadius: '4px 4px 2px 2px', height: bar.h, background: bar.hot ? 'linear-gradient(180deg, #9ec6ec, #5f8fb8)' : 'rgba(231,238,246,0.10)' }} />
            ))}
          </div>
        </div>

        {/* Stock + Reservas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ flex: 1, ...C.card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={C.label}>Stock disponible</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 11, marginTop: 14 }}>
              <span style={{ fontSize: 46, fontWeight: 600, letterSpacing: -1 }}>{disp.length}</span>
              <span style={{ fontSize: 14, color: '#828a94' }}>de {equipos.length} equipos</span>
            </div>
            <div style={{ fontSize: 13, color: '#a6afba', marginTop: 8 }}>{stockNuevos} nuevos · {stockUsados} usados</div>
          </div>
          <div style={{ flex: 1, ...C.card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={C.label}>Reservas activas</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 11, marginTop: 14 }}>
              <span style={{ fontSize: 46, fontWeight: 600, letterSpacing: -1 }}>{reservasActivas.length}</span>
              <span style={{ fontSize: 14, color: '#828a94' }}>{fARS(reservasSenasTot)} en señas</span>
            </div>

            <div style={{ fontSize: 13, color: '#a6afba', marginTop: 8 }}>Seña a cuenta · sin vencimiento</div>
          </div>
        </div>
      </div>

      {/* Row 2: Cobros próximos + El mes en cobros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={C.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={C.label}>Cobros próximos</span>
            <button onClick={onGoCobros} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#74a8d6' }}>Ver calendario →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {cobrosProx.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 0', borderTop: '1px solid rgba(231,238,246,0.06)' }}>
                <div style={{ width: 50, flexShrink: 0, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1 }}>{c.d}</div>
                  <div style={{ ...C.mono(9), letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{MONTH_ABBR[c.m-1].toUpperCase()}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 500, color: '#eef2f7' }}>{c.cliente}</div>
                  <div style={{ fontSize: 12.5, color: '#828a94' }}>{c.equipo}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{fARS(c.monto)}</div>
                  <div style={{ ...C.mono(10, '#93b8da'), letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Cuota</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...C.card, display: 'flex', flexDirection: 'column' }}>
          <span style={{ ...C.label, marginBottom: 20 }}>El mes en cobros</span>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, color: '#a6afba' }}>Por cobrar</div>
            <div style={C.serif(38, '#9ec6ec')}>{fARS(totPorCobrar)}</div>
          </div>
          <div style={{ display: 'flex', height: 8, borderRadius: 8, overflow: 'hidden', marginBottom: 18, background: 'rgba(231,238,246,0.06)' }}>
            <div style={{ width: `${(totCobrado/totAll)*100}%`, background: '#82b39d' }} />
            <div style={{ width: `${(totVencido/totAll)*100}%`, background: '#d98a76' }} />
            <div style={{ width: `${(totPorCobrar/totAll)*100}%`, background: '#74a8d6' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['#82b39d','Cobrado',totCobrado],['#d98a76','Vencido',totVencido]].map(([color,label,val]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: color, display: 'inline-block' }} />
                  <span style={{ fontSize: 13.5, color: '#a6afba' }}>{label}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>{fARS(val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Actividad + Requiere atención */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16 }}>
        <div style={C.card}>
          <span style={C.label}>Actividad de hoy</span>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column' }}>
            {ACTIVIDAD.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderTop: '1px solid rgba(231,238,246,0.06)' }}>
                <span style={{ ...C.mono(12), width: 42 }}>{a.hora}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 500 }}>{a.equipo}</span>
                  <span style={{ fontSize: 13, color: '#828a94' }}> — {a.cliente}</span>
                </div>
                <span style={{ fontSize: 11, color: '#93b8da', fontWeight: 500, padding: '3px 9px', borderRadius: 20, border: '1px solid rgba(116,168,214,0.25)' }}>{a.modalidad}</span>
                <span style={{ fontSize: 15, fontWeight: 600, width: 84, textAlign: 'right', whiteSpace: 'nowrap' }}>{fUSD(a.usd)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '26px 28px', borderRadius: 20, border: '1px solid rgba(217,138,118,0.22)', background: 'linear-gradient(160deg, rgba(217,138,118,0.07), #181b20 60%)' }}>
          <span style={{ ...C.label, color: '#d98a76' }}>Requiere atención</span>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { dot: '#9b93d6', titulo: 'Garantía de Lucía Bringas vence el 20 jun', detalle: 'iPhone 15 Pro Max usado · avisar al cliente' },
              { dot: '#d98a76', titulo: '2 cuotas vencidas sin gestionar', detalle: 'Federico Sosa y Tomás Vera · $ 307.000 en total' },
              { dot: '#74a8d6', titulo: 'iPhone 14 con batería al 79% en stock', detalle: 'Considerar ajuste de precio o cambio de batería' },
            ].map((x, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ marginTop: 5, width: 6, height: 6, borderRadius: '50%', background: x.dot, flexShrink: 0, display: 'inline-block' }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#eef2f7' }}>{x.titulo}</div>
                  <div style={{ fontSize: 12.5, color: '#9aa2ad', marginTop: 1 }}>{x.detalle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
