import { useState } from 'react';
import { fARS, fUSD } from '../data/data.js';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });

export default function Venta({ equipos, clientes, onConfirm }) {
  const tc = 1400;
  const [equipoId, setEquipoId] = useState(null);
  const [modalidad, setModalidad] = useState('contado');
  const [cuotas, setCuotas] = useState(6);
  const [anticipo, setAnticipo] = useState('');
  const [metodo, setMetodo] = useState('Transferencia');
  const [cliente, setCliente] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');

  const disp = equipos.filter(e => e.estado === 'disponible');
  const selEq = equipos.find(e => e.id === equipoId) || null;
  const vPrecioUSD = selEq ? selEq.usd : 0;
  const vPrecioARS = vPrecioUSD * tc;
  const antNum = parseInt(anticipo || '0', 10) || 0;
  const esCuotas = modalidad === 'cuotas';
  const aFinanciar = Math.max(0, vPrecioARS - antNum);
  const cuotaMonto = esCuotas && cuotas ? Math.round(aFinanciar / cuotas) : 0;
  const cq = clienteSearch.trim().toLowerCase();
  const clienteMatches = clientes.filter(c => !cq || (c.nombre + ' ' + c.dni).toLowerCase().includes(cq)).slice(0, 4);
  const canConfirm = !!selEq && !!cliente;

  const stepLabel = (n) => ({ ...MONO(11, '#74a8d6'), border: '1px solid rgba(116,168,214,0.4)', borderRadius: 6, padding: '2px 7px' });
  const pillSel = { padding: '16px', borderRadius: 13, background: 'rgba(116,168,214,0.12)', border: '1px solid rgba(116,168,214,0.5)', textAlign: 'left' };
  const pillUnsel = { padding: '16px', borderRadius: 13, background: 'rgba(231,238,246,0.02)', border: '1px solid rgba(231,238,246,0.09)', textAlign: 'left' };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Nueva operación</div>
        <h1 style={{ margin: 0, fontSize: 33, fontWeight: 600, letterSpacing: -0.5 }}>
          Registrar una <span style={SERIF(33, '#9ec6ec')}>venta</span>
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.42fr) minmax(0,1fr)', gap: 24, alignItems: 'start' }}>
        {/* Left: form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>

          {/* Step 01 – Equipo */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 15 }}>
              <span style={stepLabel()}>01</span>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>Equipo</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 290, overflowY: 'auto', paddingRight: 4 }}>
              {disp.map(e => {
                const active = equipoId === e.id;
                return (
                  <button key={e.id} onClick={() => setEquipoId(e.id)} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: '13px 16px 13px 18px', borderRadius: 12, border: '1px solid rgba(231,238,246,0.08)', background: active ? 'rgba(116,168,214,0.06)' : 'rgba(231,238,246,0.02)', cursor: 'pointer' }}>
                    {active && <span style={{ position: 'absolute', left: 0, top: 11, bottom: 11, width: 3, borderRadius: '0 3px 3px 0', background: '#74a8d6' }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7' }}>{e.modelo}</div>
                      <div style={{ fontSize: 12, color: '#828a94', marginTop: 1 }}>{e.cap} · {e.color}{e.bat ? ` · ${e.bat}%` : ''}</div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#eef2f7' }}>{fUSD(e.usd)}</span>
                    {active
                      ? <span style={{ width: 21, height: 21, borderRadius: '50%', background: '#74a8d6', color: '#14171c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓</span>
                      : <span style={{ width: 21, height: 21, borderRadius: '50%', border: '1px solid rgba(231,238,246,0.16)', flexShrink: 0 }} />
                    }
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 02 – Cliente */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 15 }}>
              <span style={stepLabel()}>02</span>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>Cliente</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '11px 15px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.08)' }}>
              <div style={{ width: 13, height: 13, border: '1.5px solid #6a717b', borderRadius: '50%', position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', width: 5, height: 1.5, background: '#6a717b', transform: 'rotate(45deg)', bottom: -2, right: -3 }} />
              </div>
              <input value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} placeholder="Buscar cliente por nombre o DNI…" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 13.5 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {clienteMatches.map(c => {
                const active = cliente === c.nombre;
                return (
                  <button key={c.id} onClick={() => setCliente(c.nombre)} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '11px 15px', borderRadius: 11, border: '1px solid rgba(231,238,246,0.08)', background: active ? 'rgba(116,168,214,0.06)' : 'rgba(231,238,246,0.02)', cursor: 'pointer' }}>
                    {active && <span style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: '0 3px 3px 0', background: '#74a8d6' }} />}
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(116,168,214,0.14)', color: '#9ec6ec', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{c.inicial}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#eef2f7' }}>{c.nombre}</span>
                    <span style={{ ...MONO(12), color: '#828a94' }}>DNI {c.dni}</span>
                    {active && <span style={{ color: '#74a8d6', fontSize: 14 }}>✓</span>}
                  </button>
                );
              })}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 15px', borderRadius: 11, border: '1px dashed rgba(231,238,246,0.16)', color: '#828a94', fontSize: 13.5, alignSelf: 'flex-start', cursor: 'pointer' }}>+ Cliente nuevo</span>
            </div>
          </div>

          {/* Step 03 – Modalidad */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 15 }}>
              <span style={stepLabel()}>03</span>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>Modalidad de pago</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              {[['contado','Contado','Pago único'],['cuotas','En cuotas','Financiación propia']].map(([key, title, sub]) => {
                const sel = modalidad === key;
                return (
                  <button key={key} onClick={() => setModalidad(key)} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                    <div style={sel ? pillSel : pillUnsel}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: sel ? '#eef2f7' : '#a6afba' }}>{title}</div>
                      <div style={{ fontSize: 12.5, color: sel ? '#93b8da' : '#828a94', marginTop: 2 }}>{sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {esCuotas && (
              <div style={{ padding: 18, borderRadius: 13, border: '1px solid rgba(231,238,246,0.07)', background: 'rgba(231,238,246,0.015)' }}>
                <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 11 }}>Cantidad de cuotas</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                  {[3,6,9,12].map(n => (
                    <button key={n} onClick={() => setCuotas(n)} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                      <div style={{ padding: '11px 0', borderRadius: 10, background: cuotas === n ? '#74a8d6' : 'rgba(231,238,246,0.04)', color: cuotas === n ? '#14171c' : '#a6afba', fontSize: 14, fontWeight: cuotas === n ? 600 : 500, textAlign: 'center' }}>{n}</div>
                    </button>
                  ))}
                </div>
                <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 9 }}>Anticipo / seña (ARS)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 15px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)' }}>
                  <span style={{ color: '#828a94', fontSize: 15 }}>$</span>
                  <input type="text" inputMode="numeric" value={anticipo} onChange={e => setAnticipo(e.target.value.replace(/[^0-9]/g,''))} placeholder="0" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 15, fontWeight: 500 }} />
                </div>
              </div>
            )}
          </div>

          {/* Step 04 – Método */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 15 }}>
              <span style={stepLabel()}>04</span>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>Método</span>
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              {['Transferencia','Débito','Crédito'].map(m => {
                const sel = metodo === m;
                return (
                  <button key={m} onClick={() => setMetodo(m)} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                    <div style={{ padding: '12px 10px', borderRadius: 11, background: sel ? 'rgba(116,168,214,0.14)' : 'rgba(231,238,246,0.03)', border: `1px solid ${sel ? 'rgba(116,168,214,0.45)' : 'rgba(231,238,246,0.08)'}`, color: sel ? '#eef2f7' : '#828a94', fontSize: 13, fontWeight: sel ? 600 : 500, textAlign: 'center' }}>{m}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: comprobante */}
        <div style={{ position: 'sticky', top: 96, padding: 28, borderRadius: 20, border: '1px solid rgba(116,168,214,0.22)', background: 'linear-gradient(160deg, rgba(116,168,214,0.07), #181b20 55%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <span style={SERIF(22)}>Comprobante</span>
            <span style={{ ...MONO(9.5, '#93b8da'), letterSpacing: 1.5, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20, border: '1px solid rgba(116,168,214,0.3)' }}>Borrador</span>
          </div>
          <div style={{ paddingBottom: 18, borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#eef2f7' }}>{selEq ? selEq.modelo : 'Elegí un equipo'}</div>
            <div style={{ fontSize: 13, color: '#828a94', marginTop: 2 }}>{selEq ? `${selEq.cap} · ${selEq.color}` : 'Pendiente de selección'}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 14 }}>
              <span style={SERIF(34, '#f6f9fc')}>{selEq ? fUSD(vPrecioUSD) : 'US$ —'}</span>
              <span style={{ fontSize: 13, color: '#828a94' }}>{selEq ? fARS(vPrecioARS) : '—'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, padding: '18px 0', borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
            {[['Cliente', cliente || '—'],['Método', metodo]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13.5, color: '#828a94' }}>{k}</span>
                <span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 500, whiteSpace: 'nowrap' }}>{v}</span>
              </div>
            ))}
            {!esCuotas && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13.5, color: '#828a94' }}>Modalidad</span>
                <span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 500, whiteSpace: 'nowrap' }}>Contado · pago único</span>
              </div>
            )}
            {esCuotas && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13.5, color: '#828a94' }}>Anticipo</span>
                  <span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 500, whiteSpace: 'nowrap' }}>{fARS(antNum)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13.5, color: '#828a94' }}>A financiar</span>
                  <span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 500, whiteSpace: 'nowrap' }}>{fARS(aFinanciar)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13.5, color: '#828a94' }}>Primera vence</span>
                  <span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 500, whiteSpace: 'nowrap' }}>15 jul 2026</span>
                </div>
              </>
            )}
          </div>
          {esCuotas && (
            <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
              <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase' }}>Plan de pago</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 15, color: '#a6afba' }}>{cuotas} cuotas de</span>
                <span style={SERIF(26, '#9ec6ec')}>{fARS(cuotaMonto)}</span>
              </div>
            </div>
          )}
          <div style={{ marginTop: 22 }}>
            {canConfirm
              ? <button onClick={onConfirm} style={{ width: '100%', padding: 15, borderRadius: 13, border: '1px solid rgba(255,255,255,0.2)', background: 'linear-gradient(160deg, #eef2f6, #b7c3ce)', color: '#14171c', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 22px -10px rgba(180,200,220,0.7)' }}>Confirmar venta</button>
              : <div style={{ width: '100%', padding: 15, borderRadius: 13, background: 'rgba(231,238,246,0.04)', color: '#6a717b', fontSize: 15, fontWeight: 600, textAlign: 'center' }}>Elegí equipo y cliente</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
