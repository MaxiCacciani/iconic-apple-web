import { RESERVAS, fARS, fUSD } from '../data/data.js';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });

const TC = 1400;

export default function Reservas() {
  const activas = RESERVAS.filter(r => r.estado === 'activa');
  const senasTot = activas.reduce((a, b) => a + b.sena, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 26, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Apartados</div>
          <h1 style={{ margin: 0, fontSize: 33, fontWeight: 600, letterSpacing: -0.5, whiteSpace: 'nowrap' }}>
            Equipos <span style={SERIF(33, '#9ec6ec')}>reservados</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 26 }}>
          <div>
            <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>Activas</div>
            <div style={{ fontSize: 19, fontWeight: 600, color: '#eef2f7' }}>
              {activas.length} <span style={{ fontSize: 13, color: '#828a94', fontWeight: 400 }}>de {RESERVAS.length}</span>
            </div>
          </div>
          <div>
            <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>En señas</div>
            <div style={{ fontSize: 19, fontWeight: 600, color: '#74a8d6', whiteSpace: 'nowrap' }}>{fARS(senasTot)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {RESERVAS.map(r => {
          const pct = Math.round(r.sena / (r.usd * TC) * 100);
          const esActiva = r.estado === 'activa';
          return (
            <div key={r.id} style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0,2.1fr) minmax(0,1fr) minmax(0,1.5fr)', gap: 22, alignItems: 'center', padding: '22px 24px 22px 28px', borderRadius: 16, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20', overflow: 'hidden' }}>
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: esActiva ? '#82b39d' : '#6a717b' }} />
              <div>
                <div style={{ fontSize: 16.5, fontWeight: 600, color: '#eef2f7' }}>{r.equipo}</div>
                <div style={{ fontSize: 13, color: '#828a94', marginTop: 2 }}>{r.spec}</div>
                <div style={{ fontSize: 13, color: '#a6afba', marginTop: 9 }}>Reservado por <span style={{ color: '#eef2f7', fontWeight: 500 }}>{r.cliente}</span></div>
              </div>
              <div>
                <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>Seña</div>
                <div style={SERIF(25, '#9ec6ec')}>{fARS(r.sena)}</div>
                <div style={{ fontSize: 12, color: '#828a94', marginTop: 5 }}>{pct}% · {fUSD(r.usd)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  {esActiva
                    ? <span style={{ fontSize: 12, color: '#b6cdc1', padding: '4px 11px', borderRadius: 20, background: 'rgba(130,179,157,0.13)' }}>Activa</span>
                    : <span style={{ fontSize: 12, color: '#a6afba', padding: '4px 11px', borderRadius: 20, background: 'rgba(231,238,246,0.06)' }}>Convertida</span>
                  }
                  <span style={{ ...MONO(12, '#a6afba') }}>Reservado {r.fecha}</span>
                </div>
                {esActiva
                  ? <span style={{ fontSize: 13, fontWeight: 600, color: '#14171c', background: 'linear-gradient(160deg, #eef2f6, #b7c3ce)', padding: '8px 15px', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>Convertir en venta</span>
                  : <span style={{ fontSize: 13, fontWeight: 500, color: '#82b39d', whiteSpace: 'nowrap' }}>✓ Entregado al cliente</span>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
