import { useState } from 'react';
import { EQUIPOS, fARS, fUSD, batColor } from '../data/data.js';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });

export default function Stock() {
  const [search, setSearch] = useState('');
  const [cond, setCond] = useState('todas');
  const [estado, setEstado] = useState('todos');

  const tc = 1400;
  const q = search.trim().toLowerCase();

  const filtered = EQUIPOS.filter(e => {
    if (cond !== 'todas' && e.cond !== cond) return false;
    if (estado !== 'todos' && e.estado !== estado) return false;
    if (q) { const hay = (e.modelo + ' ' + e.cap + ' ' + e.color + ' ' + e.imei).toLowerCase(); if (!hay.includes(q)) return false; }
    return true;
  });

  const valorDisp = EQUIPOS.filter(e => e.estado === 'disponible').reduce((a, b) => a + b.usd, 0);

  const condFilters = [['todas','Todas'],['Nuevo','Nuevos'],['Usado','Usados']];
  const estCount = (k) => k === 'todos' ? EQUIPOS.length : EQUIPOS.filter(e => e.estado === k).length;
  const estadoFilters = [['todos','Todos'],['disponible','Disp.'],['reservado','Reserv.'],['vendido','Vend.']];

  const pillActive = { padding: '9px 14px', borderRadius: 30, background: 'rgba(116,168,214,0.16)', border: '1px solid rgba(116,168,214,0.5)', color: '#eef2f7', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 };
  const pillInactive = { padding: '9px 14px', borderRadius: 30, background: 'rgba(231,238,246,0.03)', border: '1px solid rgba(231,238,246,0.08)', color: '#828a94', fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 7 };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Inventario</div>
          <h1 style={{ margin: 0, fontSize: 33, fontWeight: 600, letterSpacing: -0.5, whiteSpace: 'nowrap' }}>
            Stock <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400, color: '#9ec6ec' }}>en piso</span>
          </h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...MONO(10), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>Valor disponible</div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 30, color: '#eef2f7' }}>{fUSD(valorDisp)}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 240, padding: '10px 15px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.08)' }}>
          <div style={{ width: 13, height: 13, border: '1.5px solid #6a717b', borderRadius: '50%', position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', width: 5, height: 1.5, background: '#6a717b', transform: 'rotate(45deg)', bottom: -2, right: -3 }} />
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar por modelo, color o IMEI…" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 13.5 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {condFilters.map(([key, label]) => (
            <button key={key} onClick={() => setCond(key)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={cond === key ? pillActive : pillInactive}>{label}</span>
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 26, background: 'rgba(231,238,246,0.1)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {estadoFilters.map(([key, label]) => (
            <button key={key} onClick={() => setEstado(key)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={estado === key ? pillActive : pillInactive}>
                {label} <span style={{ ...MONO(11), color: estado === key ? '#93b8da' : '#6a717b' }}>{estCount(key)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.3fr 0.85fr 1fr 1.25fr 0.95fr 0.95fr', gap: 16, padding: '0 18px 11px', borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
        {['Equipo','Condición','Batería','IMEI','Precio','Estado'].map((h, i) => (
          <span key={h} style={{ ...MONO(10, '#6a717b'), letterSpacing: 1.5, textTransform: 'uppercase', textAlign: i >= 4 ? 'right' : 'left' }}>{h}</span>
        ))}
      </div>

      {/* Table rows */}
      <div>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#6a717b', fontSize: 14 }}>Sin equipos que coincidan con el filtro.</div>
        )}
        {filtered.map(e => (
          <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '2.3fr 0.85fr 1fr 1.25fr 0.95fr 0.95fr', gap: 16, alignItems: 'center', padding: '15px 18px', borderBottom: '1px solid rgba(231,238,246,0.05)', borderRadius: 12 }}>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 600, color: '#eef2f7' }}>{e.modelo}</div>
              <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 2 }}>{e.cap} · {e.color}</div>
            </div>
            <div>
              {e.cond === 'Nuevo'
                ? <span style={{ fontSize: 12, color: '#b6cdc1', padding: '3px 10px', borderRadius: 6, background: 'rgba(130,179,157,0.12)' }}>Nuevo</span>
                : <span style={{ fontSize: 12, color: '#a6afba', padding: '3px 10px', borderRadius: 6, background: 'rgba(231,238,246,0.06)' }}>Usado</span>
              }
            </div>
            <div>
              {e.cond === 'Nuevo'
                ? <span style={{ fontSize: 12.5, color: '#6a717b' }}>Sellado</span>
                : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 34, height: 7, borderRadius: 4, background: 'rgba(231,238,246,0.1)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${e.bat}%`, background: batColor(e.bat) }} />
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: batColor(e.bat) }}>{e.bat}%</span>
                  </div>
                )
              }
            </div>
            <div style={{ ...MONO(12), letterSpacing: 0.3 }}>{e.imei}</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15.5, fontWeight: 600, color: '#eef2f7', whiteSpace: 'nowrap' }}>{fUSD(e.usd)}</div>
              <div style={{ fontSize: 11.5, color: '#828a94', marginTop: 1, whiteSpace: 'nowrap' }}>{fARS(e.usd * tc)}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {e.estado === 'disponible' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#b6cdc1' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#82b39d', display: 'inline-block' }} />Disponible</span>}
              {e.estado === 'reservado'  && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#74a8d6' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#74a8d6', display: 'inline-block' }} />Reservado</span>}
              {e.estado === 'vendido'    && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#6a717b' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6a717b', display: 'inline-block' }} />Vendido</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
