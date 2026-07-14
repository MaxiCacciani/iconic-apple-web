import { useState } from 'react';
import { fUSD } from '../lib/utils.js';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });

const CAT_COLORS = ['#74a8d6', '#82b39d', '#9b93d6', '#d9b876', '#9ec6ec', '#d98a76', '#b6cdc1', '#a6afba'];

function isoHoy(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function toNum(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return y * 10000 + m * 100 + d;
}

const dateInput = {
  padding: '9px 12px', borderRadius: 10, background: '#1e2228',
  border: '1px solid rgba(231,238,246,0.12)', color: '#eef2f7', fontSize: 13.5,
  colorScheme: 'dark', fontFamily: "'Hanken Grotesk', sans-serif",
};

export default function Ganancias({ ventas }) {
  const hoy = isoHoy(0);
  const [desde, setDesde] = useState(hoy.slice(0, 8) + '01');
  const [hasta, setHasta] = useState(hoy);

  const presets = [
    ['Este mes', hoy.slice(0, 8) + '01', hoy],
    ['Mes pasado', (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; })(), (() => { const d = new Date(); d.setDate(0); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()],
    ['Últimos 30 días', isoHoy(-30), hoy],
    ['Este año', hoy.slice(0, 4) + '-01-01', hoy],
    ['Todo', '', hoy],
  ];

  const dNum = toNum(desde) ?? 0;
  const hNum = toNum(hasta) ?? 99999999;
  const enRango = ventas.filter(v => v.fechaNum >= dNum && v.fechaNum <= hNum);

  // Desglose por línea de venta: cada línea tiene categoría, precio, costo y cantidad
  const porCat = new Map();
  let totalIngresos = 0, totalCosto = 0, totalGanancia = 0, lineasSinCosto = 0;
  for (const v of enRango) {
    const lineas = v.lineas?.length
      ? v.lineas
      : [{ categoria: v.categoria || 'Otro', usd: v.usd, costo: v.costo, cantidad: 1, esRegalo: false }];
    for (const l of lineas) {
      const cat = l.categoria || 'Otro';
      const qty = l.cantidad || 1;
      const ingresos = l.esRegalo ? 0 : (l.usd || 0) * qty;
      const costo = l.costo != null ? l.costo * qty : null;
      const e = porCat.get(cat) || { ingresos: 0, costo: 0, ganancia: 0, unidades: 0, sinCosto: 0 };
      e.ingresos += ingresos;
      e.unidades += qty;
      if (costo !== null) { e.costo += costo; e.ganancia += ingresos - costo; totalCosto += costo; totalGanancia += ingresos - costo; }
      else { e.sinCosto += 1; lineasSinCosto += 1; }
      porCat.set(cat, e);
      totalIngresos += ingresos;
    }
  }
  const cats = [...porCat.entries()].map(([cat, e]) => ({ cat, ...e })).sort((a, b) => b.ganancia - a.ganancia);
  const maxAbs = Math.max(...cats.map(c => Math.abs(c.ganancia)), 1);
  const margenTotal = totalCosto > 0 ? Math.round((totalGanancia / totalCosto) * 100) : null;

  const card = { padding: '22px 24px', borderRadius: 18, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20', minWidth: 0 };
  const statVal = (color = '#eef2f7') => ({ ...SERIF('clamp(23px, 5.5vw, 34px)', color), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });

  return (
    <div>
      <div className="page-head" style={{ marginBottom: 22 }}>
        <div>
          <div style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Análisis del negocio</div>
          <h1 className="page-title">Dashboard de <span style={SERIF('inherit', '#82b39d')}>ganancias</span></h1>
        </div>
      </div>

      {/* Selector de período */}
      <div style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase' }}>Período</span>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={dateInput} />
          <span style={{ color: '#6a717b', fontSize: 13 }}>hasta</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={dateInput} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {presets.map(([label, d, h]) => {
            const activo = desde === d && hasta === h;
            return (
              <button key={label} onClick={() => { setDesde(d); setHasta(h); }}
                style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer', border: 'none', fontFamily: "'Hanken Grotesk', sans-serif", background: activo ? '#82b39d' : 'rgba(231,238,246,0.06)', color: activo ? '#14171c' : '#828a94', fontWeight: activo ? 600 : 400 }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Totales del período */}
      <div className="rg-stats4" style={{ marginBottom: 20 }}>
        <div style={card}>
          <div style={{ ...MONO(10), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Ganancia</div>
          <div style={statVal(totalGanancia >= 0 ? '#82b39d' : '#d98a76')}>{totalGanancia >= 0 ? '+' : ''}{fUSD(totalGanancia)}</div>
          {margenTotal !== null && <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 5 }}>{margenTotal}% sobre el costo</div>}
        </div>
        <div style={card}>
          <div style={{ ...MONO(10), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Ingresos</div>
          <div style={statVal()}>{fUSD(totalIngresos)}</div>
          <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 5 }}>{enRango.length} venta{enRango.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={card}>
          <div style={{ ...MONO(10), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Costo</div>
          <div style={statVal('#a6afba')}>{fUSD(totalCosto)}</div>
          <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 5 }}>de lo vendido con costo cargado</div>
        </div>
        <div style={card}>
          <div style={{ ...MONO(10), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Categorías</div>
          <div style={statVal('#9ec6ec')}>{cats.length}</div>
          <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 5 }}>con ventas en el período</div>
        </div>
      </div>

      {lineasSinCosto > 0 && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(217,184,118,0.07)', border: '1px solid rgba(217,184,118,0.25)', fontSize: 12.5, color: '#d9b876' }}>
          ⚠ {lineasSinCosto} línea{lineasSinCosto !== 1 ? 's' : ''} de venta sin costo cargado — su ganancia no se puede calcular y no suma al total. Cargá el costo desde el Historial de ventas.
        </div>
      )}

      {/* Desglose por categoría */}
      <div style={{ padding: '24px 26px', borderRadius: 18, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20' }}>
        <div style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 18 }}>Ganancia por categoría</div>
        {cats.length === 0 && <div style={{ padding: '20px 0', textAlign: 'center', color: '#6a717b', fontSize: 13.5 }}>Sin ventas en el período elegido.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {cats.map((c, i) => {
            const color = CAT_COLORS[i % CAT_COLORS.length];
            const pct = c.costo > 0 ? Math.round((c.ganancia / c.costo) * 100) : null;
            return (
              <div key={c.cat}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#eef2f7' }}>{c.cat}</span>
                    <span style={{ fontSize: 12, color: '#6a717b' }}>{c.unidades} ud{c.unidades !== 1 ? 's' : ''}.</span>
                    {c.sinCosto > 0 && <span style={{ fontSize: 11, color: '#d9b876' }}>({c.sinCosto} sin costo)</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: '#828a94', whiteSpace: 'nowrap' }}>vendido {fUSD(c.ingresos)}</span>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: c.ganancia >= 0 ? '#82b39d' : '#d98a76', whiteSpace: 'nowrap' }}>
                      {c.ganancia >= 0 ? '+' : ''}{fUSD(c.ganancia)}{pct !== null ? ` · ${pct}%` : ''}
                    </span>
                  </div>
                </div>
                <div style={{ height: 8, borderRadius: 6, background: 'rgba(231,238,246,0.05)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(Math.abs(c.ganancia) / maxAbs * 100)}%`, height: '100%', borderRadius: 6, background: c.ganancia >= 0 ? color : '#d98a76', transition: 'width 0.3s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
