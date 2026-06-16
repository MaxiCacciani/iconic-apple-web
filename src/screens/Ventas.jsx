import { useState } from 'react';
import { fARS, fUSD } from '../data/data.js';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });

const METODO_COLORS = {
  'Transferencia': { bg: 'rgba(116,168,214,0.1)',  color: '#74a8d6' },
  'Débito':        { bg: 'rgba(130,179,157,0.1)',  color: '#82b39d' },
  'Crédito':       { bg: 'rgba(155,147,214,0.12)', color: '#9b93d6' },
  'Efectivo':      { bg: 'rgba(231,238,246,0.07)', color: '#a6afba' },
};

const TC = 1400;

function StatCard({ label, value, sub }) {
  return (
    <div style={{ padding: '22px 24px', borderRadius: 18, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20' }}>
      <div style={{ ...MONO(10), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={SERIF(34, '#eef2f7')}>{value}</div>
      {sub && <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

export default function Ventas({ ventas }) {
  const [q, setQ] = useState('');
  const [filtroMod, setFiltroMod] = useState('todas');
  const [filtroMet, setFiltroMet] = useState('todos');
  const [filtroMes, setFiltroMes] = useState('todos');
  const [verTodas, setVerTodas] = useState(false);

  const sorted = [...ventas].sort((a, b) => b.fechaNum - a.fechaNum);

  // Build unique month keys sorted descending: '2026-06', '2026-05', ...
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
  const ventasCuotas = ventas.filter(v => v.modalidad === 'cuotas').length;
  const promUSD = ventas.length ? Math.round(totalUSD / ventas.length) : 0;

  const pill = (active) => ({
    padding: '5px 13px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer',
    border: 'none', fontFamily: "'Hanken Grotesk', sans-serif",
    background: active ? '#74a8d6' : 'rgba(231,238,246,0.06)',
    color: active ? '#14171c' : '#828a94',
    fontWeight: active ? 600 : 400,
  });

  const metodos = ['todos', ...Array.from(new Set(ventas.map(v => v.metodo)))];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Registro histórico</div>
          <h1 style={{ margin: 0, fontSize: 33, fontWeight: 600, letterSpacing: -0.5 }}>
            Historial de <span style={SERIF(33, '#9ec6ec')}>ventas</span>
          </h1>
        </div>
        <div style={{ ...MONO(12), color: '#6a717b' }}>{ventas.length} registros en total</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total ventas" value={ventas.length} sub="registros históricos" />
        <StatCard label="Ingresos total" value={fUSD(totalUSD)} sub={fARS(totalUSD * TC) + ' al TC actual'} />
        <StatCard label="Ticket promedio" value={fUSD(promUSD)} sub="por operación" />
        <StatCard label="Con financiación" value={ventasCuotas} sub={`de ${ventas.length} ventas en cuotas`} />
      </div>

      {/* Filters */}
      <div style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20', marginBottom: 16 }}>
        {/* Search */}
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

      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: '0.65fr 2fr 1.1fr 1.4fr 0.85fr 1fr', gap: 14, padding: '0 16px 11px', borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
        {[['Fecha','left'],['Equipo','left'],['Cliente','left'],['Modalidad','left'],['Método','left'],['Precio','right']].map(([h, align]) => (
          <span key={h} style={{ ...MONO(10, '#6a717b'), letterSpacing: 1.5, textTransform: 'uppercase', textAlign: align }}>{h}</span>
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
        return (
          <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '0.65fr 2fr 1.1fr 1.4fr 0.85fr 1fr', gap: 14, alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid rgba(231,238,246,0.05)', borderRadius: 10, background: esNueva ? 'rgba(116,168,214,0.04)' : 'none' }}>
            {/* Fecha */}
            <div style={{ ...MONO(12, '#828a94') }}>{v.fechaLabel}</div>

            {/* Equipo */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#eef2f7' }}>{v.equipo}</div>
              {v.imei && <div style={{ ...MONO(11, '#6a717b'), marginTop: 3, letterSpacing: 0.2 }}>{v.imei}</div>}
            </div>

            {/* Cliente */}
            <div style={{ fontSize: 13.5, color: '#a6afba' }}>{v.cliente}</div>

            {/* Modalidad */}
            <div>
              {v.modalidad === 'contado'
                ? <span style={{ fontSize: 13, color: '#b6cdc1' }}>Contado · pago único</span>
                : (
                  <div>
                    <div style={{ fontSize: 13, color: '#eef2f7', fontWeight: 500 }}>{v.cuotas} cuotas</div>
                    {v.cuotaMonto && <div style={{ fontSize: 11.5, color: '#74a8d6', marginTop: 2 }}>{fARS(v.cuotaMonto)} / mes</div>}
                    {v.anticipo ? <div style={{ fontSize: 11, color: '#828a94', marginTop: 1 }}>Anticipo {fARS(v.anticipo)}</div> : null}
                  </div>
                )
              }
            </div>

            {/* Método */}
            <div>
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, ...metC }}>{v.metodo}</span>
            </div>

            {/* Precio */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#eef2f7', whiteSpace: 'nowrap' }}>{fUSD(v.usd)}</div>
              <div style={{ fontSize: 11.5, color: '#828a94', marginTop: 1, whiteSpace: 'nowrap' }}>{fARS(v.usd * TC)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
