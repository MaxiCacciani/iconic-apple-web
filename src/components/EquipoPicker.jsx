import { useState } from 'react';
import { getCatDef } from '../data/data.js';
import { fUSD, MONO } from '../lib/utils.js';
import BatBadge from './BatBadge.jsx';

export default function EquipoPicker({ equipos, carrito, onAdd, onRemoveAll, onDecrement }) {
  const [q, setQ] = useState('');
  const [filtroCond, setFiltroCond] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const disp = equipos.filter(e => e.estado === 'disponible');
  const tiposDisp = ['todos', ...Array.from(new Set(disp.map(e => getCatDef(e.categoria).enTabPropia ? e.categoria : 'Accesorios')))];
  const qLow = q.trim().toLowerCase();
  const filtrados = disp.filter(e => {
    if (filtroCond !== 'todos' && e.cond !== filtroCond) return false;
    const tipoEq = getCatDef(e.categoria).enTabPropia ? e.categoria : 'Accesorios';
    if (filtroTipo !== 'todos' && tipoEq !== filtroTipo) return false;
    if (!qLow) return true;
    return (e.modelo + e.imei + e.color + e.cap + e.categoria).toLowerCase().includes(qLow);
  });

  const pillB = (active) => ({ padding: '5px 13px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer', border: 'none', fontFamily: "'Hanken Grotesk', sans-serif", background: active ? '#74a8d6' : 'rgba(231,238,246,0.06)', color: active ? '#14171c' : '#828a94', fontWeight: active ? 600 : 400 });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11, padding: '10px 14px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)' }}>
        <span style={{ color: '#6a717b', fontSize: 14 }}>⌕</span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por modelo, IMEI, color, capacidad…" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 13.5 }} />
        {q && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', color: '#6a717b', cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {['todos','Nuevo','Usado'].map(c => <button key={c} onClick={() => setFiltroCond(c)} style={pillB(filtroCond === c)}>{c === 'todos' ? 'Todas' : c}</button>)}
        <span style={{ width: 1, background: 'rgba(231,238,246,0.1)', alignSelf: 'stretch', margin: '0 2px' }} />
        {tiposDisp.map(t => <button key={t} onClick={() => setFiltroTipo(t)} style={pillB(filtroTipo === t)}>{t === 'todos' ? 'Todos' : t}</button>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
        {filtrados.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#6a717b', fontSize: 13.5 }}>Sin resultados{q ? ` para "${q}"` : ''}.</div>}
        {filtrados.map(e => {
          const cartSlots = carrito.filter(c => c.id === e.id);
          const enCarrito = cartSlots.length > 0;
          const eDef    = getCatDef(e.categoria);
          const isPhone = eDef.tieneIMEI;
          const cantActual = cartSlots.reduce((s, c) => s + (c.cantidadVenta || 1), 0);
          const puedeMas = cantActual < e.cantidad;
          const isCons  = eDef.tieneControles;
          const tieneDefectos = e.defectos && e.defectos.trim().length > 0;
          const bordeCard = enCarrito ? 'rgba(130,179,157,0.45)' : (!isCons && tieneDefectos) ? 'rgba(217,138,118,0.25)' : 'rgba(231,238,246,0.08)';
          return (
            <div key={e.id} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 16px', borderRadius: 12, border: `1px solid ${bordeCard}`, background: enCarrito ? 'rgba(130,179,157,0.05)' : 'rgba(231,238,246,0.02)' }}>
              {enCarrito && <span style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: '0 3px 3px 0', background: '#82b39d' }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7' }}>{e.modelo}</span>
                  {e.cap && <span style={{ fontSize: 12.5, color: '#828a94' }}>{e.cap}</span>}
                  <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 20, background: e.cond === 'Nuevo' ? 'rgba(130,179,157,0.13)' : 'rgba(116,168,214,0.12)', color: e.cond === 'Nuevo' ? '#82b39d' : '#74a8d6' }}>{e.cond}</span>
                  {!isPhone && e.cantidad > 1 && <span style={{ fontSize: 11, color: '#6a717b' }}>{e.cantidad} uds. en stock</span>}
                </div>
                <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 3 }}>{e.color}</div>
                {isPhone && e.imei && <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7 }}><span style={{ ...MONO(10), color: '#6a717b', letterSpacing: 1, textTransform: 'uppercase' }}>IMEI</span><span style={{ ...MONO(12.5, '#a6afba') }}>{e.imei}</span></div>}
                {isPhone && e.cond === 'Usado' && e.bat && <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 7 }}><span style={{ ...MONO(10), color: '#6a717b', letterSpacing: 1, textTransform: 'uppercase' }}>Batería</span><BatBadge bat={e.bat} /></div>}
                {isCons && e.bat > 0 && <div style={{ fontSize: 12, color: '#9b93d6', marginTop: 5 }}>{e.bat} control{e.bat !== 1 ? 'es' : ''}</div>}
                {isCons && tieneDefectos && <div style={{ fontSize: 12, color: '#828a94', marginTop: 3 }}>{e.defectos}</div>}
                {!isCons && tieneDefectos && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 7, padding: '6px 10px', borderRadius: 8, background: 'rgba(217,138,118,0.08)', border: '1px solid rgba(217,138,118,0.18)' }}><span style={{ fontSize: 11 }}>⚠</span><span style={{ fontSize: 12, color: '#e6ab98' }}>{e.defectos}</span></div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#eef2f7', whiteSpace: 'nowrap' }}>{fUSD(e.usd)}</span>
                {!enCarrito && (
                  <button onClick={() => onAdd(e)} style={{ fontSize: 12, fontWeight: 600, color: '#74a8d6', background: 'rgba(116,168,214,0.08)', border: '1px solid rgba(116,168,214,0.3)', padding: '5px 10px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Agregar</button>
                )}
                {enCarrito && isPhone && (
                  <button onClick={() => onRemoveAll(e.id)} style={{ fontSize: 12, fontWeight: 600, color: '#82b39d', background: 'rgba(130,179,157,0.1)', border: '1px solid rgba(130,179,157,0.3)', padding: '5px 10px', borderRadius: 8, cursor: 'pointer' }}>✓ Quitar</button>
                )}
                {enCarrito && !isPhone && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => onDecrement(e.id)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(130,179,157,0.4)', background: 'rgba(130,179,157,0.08)', color: '#82b39d', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ minWidth: 36, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#eef2f7' }}>{cantActual}/{e.cantidad}</span>
                      <button onClick={() => onAdd(e)} disabled={!puedeMas} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${puedeMas ? 'rgba(130,179,157,0.4)' : 'rgba(231,238,246,0.08)'}`, background: puedeMas ? 'rgba(130,179,157,0.08)' : 'rgba(231,238,246,0.02)', color: puedeMas ? '#82b39d' : '#4a5058', fontSize: 14, cursor: puedeMas ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                    <button onClick={() => onRemoveAll(e.id)} style={{ fontSize: 11, color: '#6a717b', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Quitar todos</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {filtrados.length > 0 && <div style={{ ...MONO(11), marginTop: 8, textAlign: 'right' }}>{filtrados.length} equipo{filtrados.length !== 1 ? 's' : ''} disponible{filtrados.length !== 1 ? 's' : ''}</div>}
    </div>
  );
}
