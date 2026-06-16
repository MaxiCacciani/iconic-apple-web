import { useState } from 'react';
import { esPhone, fARS, fUSD, batColor, TC } from '../data/data.js';
import Modal from '../components/Modal.jsx';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });

function BatBadge({ bat }) {
  const c = batColor(bat);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 22, height: 11, borderRadius: 3, border: `1.5px solid ${c}`, position: 'relative', display: 'inline-block' }}>
        <span style={{ position: 'absolute', inset: '1.5px 1.5px 1.5px', borderRadius: 1.5, background: c, width: `${bat}%`, maxWidth: '100%' }} />
        <span style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 2.5, height: 5, borderRadius: '0 1px 1px 0', background: c }} />
      </span>
      <span style={{ fontSize: 12, color: c, fontWeight: 500 }}>{bat}%</span>
    </span>
  );
}

function EquipoPicker({ equipos, value, onChange }) {
  const [q, setQ] = useState('');
  const [filtroCond, setFiltroCond] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const disp = equipos.filter(e => e.estado === 'disponible');
  const tiposDisp = ['todos', ...Array.from(new Set(disp.map(e => esPhone(e.categoria) ? e.categoria : 'Accesorios')))];
  const qLow = q.trim().toLowerCase();
  const filtrados = disp.filter(e => {
    if (filtroCond !== 'todos' && e.cond !== filtroCond) return false;
    const tipoEq = esPhone(e.categoria) ? e.categoria : 'Accesorios';
    if (filtroTipo !== 'todos' && tipoEq !== filtroTipo) return false;
    if (!qLow) return true;
    return (e.modelo + e.imei + e.color + e.cap).toLowerCase().includes(qLow);
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
          const active = value === e.id;
          const isPhone = esPhone(e.categoria);
          const tieneDefectos = e.defectos && e.defectos.trim().length > 0;
          return (
            <button key={e.id} onClick={() => onChange(e.id)} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14, width: '100%', textAlign: 'left', padding: '13px 16px', borderRadius: 12, border: `1px solid ${active ? 'rgba(116,168,214,0.5)' : tieneDefectos ? 'rgba(217,138,118,0.25)' : 'rgba(231,238,246,0.08)'}`, background: active ? 'rgba(116,168,214,0.07)' : 'rgba(231,238,246,0.02)', cursor: 'pointer' }}>
              {active && <span style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: '0 3px 3px 0', background: '#74a8d6' }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7' }}>{e.modelo}</span>
                  {e.cap && <span style={{ fontSize: 12.5, color: '#828a94' }}>{e.cap}</span>}
                  <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 20, background: e.cond === 'Nuevo' ? 'rgba(130,179,157,0.13)' : 'rgba(116,168,214,0.12)', color: e.cond === 'Nuevo' ? '#82b39d' : '#74a8d6' }}>{e.cond}</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 3 }}>{e.color}</div>
                {isPhone && e.imei && <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7 }}><span style={{ ...MONO(10), color: '#6a717b', letterSpacing: 1, textTransform: 'uppercase' }}>IMEI</span><span style={{ ...MONO(12.5, '#a6afba') }}>{e.imei}</span></div>}
                {isPhone && e.cond === 'Usado' && e.bat && <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 7 }}><span style={{ ...MONO(10), color: '#6a717b', letterSpacing: 1, textTransform: 'uppercase' }}>Batería</span><BatBadge bat={e.bat} /></div>}
                {tieneDefectos && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 7, padding: '6px 10px', borderRadius: 8, background: 'rgba(217,138,118,0.08)', border: '1px solid rgba(217,138,118,0.18)' }}><span style={{ fontSize: 11, marginTop: 1 }}>⚠</span><span style={{ fontSize: 12, color: '#e6ab98' }}>{e.defectos}</span></div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#eef2f7', whiteSpace: 'nowrap' }}>{fUSD(e.usd)}</span>
                {active ? <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#74a8d6', color: '#14171c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>✓</span>
                        : <span style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid rgba(231,238,246,0.16)' }} />}
              </div>
            </button>
          );
        })}
      </div>
      {filtrados.length > 0 && <div style={{ ...MONO(11), marginTop: 8, textAlign: 'right' }}>{filtrados.length} equipo{filtrados.length !== 1 ? 's' : ''} disponible{filtrados.length !== 1 ? 's' : ''}</div>}
    </div>
  );
}

function NuevoClienteModal({ nombre: nombreInit, onSave, onClose }) {
  const [nombre, setNombre] = useState(nombreInit || '');
  const [dni, setDni] = useState('');
  const [tel, setTel] = useState('');
  const [loc, setLoc] = useState('Villa Carlos Paz');

  const canSave = nombre.trim().length > 1;
  const field = { width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)', color: '#eef2f7', fontSize: 14 };
  const fw = { marginBottom: 14 };
  const MONO_L = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7, color: '#6a717b', display: 'block' };

  return (
    <Modal title="Registrar nuevo cliente" onClose={onClose} width={460}>
      <div style={fw}><span style={MONO_L}>Nombre completo *</span><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre Apellido" style={field} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, ...fw }}>
        <div><span style={MONO_L}>DNI</span><input value={dni} onChange={e => setDni(e.target.value)} placeholder="34.521.890" style={field} /></div>
        <div><span style={MONO_L}>Teléfono</span><input value={tel} onChange={e => setTel(e.target.value)} placeholder="+54 9 3541 …" style={field} /></div>
      </div>
      <div style={fw}><span style={MONO_L}>Localidad</span><input value={loc} onChange={e => setLoc(e.target.value)} placeholder="Villa Carlos Paz" style={field} /></div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 11, border: '1px solid rgba(231,238,246,0.12)', background: 'none', color: '#a6afba', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={() => canSave && onSave({ nombre: nombre.trim(), dni, tel, loc, desde: '2026' })} style={{ flex: 2, padding: 12, borderRadius: 11, border: '1px solid rgba(255,255,255,0.2)', background: canSave ? 'linear-gradient(160deg, #eef2f6, #b7c3ce)' : 'rgba(231,238,246,0.05)', color: canSave ? '#14171c' : '#6a717b', fontSize: 14, fontWeight: 600, cursor: canSave ? 'pointer' : 'default' }}>
          Registrar y seleccionar
        </button>
      </div>
    </Modal>
  );
}

export default function Venta({ equipos, clientes, onConfirm, onAddCliente }) {
  const tc = TC;
  const [equipoId, setEquipoId] = useState(null);
  const [modalidad, setModalidad] = useState('contado');
  const [cuotas, setCuotas] = useState(6);
  const [cuotasCustom, setCuotasCustom] = useState(false);
  const [anticipo, setAnticipo] = useState('');
  const [metodo, setMetodo] = useState('Transferencia');
  const [cliente, setCliente] = useState('');
  const [clienteId, setClienteId] = useState(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [nuevoClienteModal, setNuevoClienteModal] = useState(false);
  // Contado con seña
  const [tieneApartado, setTieneApartado] = useState(false);
  const [seniaContado, setSeniaContado] = useState('');
  // Plan canje
  const [canje, setCanje] = useState(false);
  const [canjeEquipo, setCanjeEquipo] = useState('');
  const [canjeValor, setCanjeValor] = useState('');

  const selEq = equipos.find(e => e.id === equipoId) || null;
  const vPrecioUSD = selEq ? selEq.usd : 0;
  const vPrecioARS = vPrecioUSD * tc;
  const antNum = parseInt(anticipo || '0', 10) || 0;
  const seniaNum = parseInt(seniaContado || '0', 10) || 0;
  const canjeNum = parseInt(canjeValor || '0', 10) || 0;
  const esCuotas = modalidad === 'cuotas';
  const aFinanciar = Math.max(0, vPrecioARS - antNum);
  const cuotaMonto = esCuotas && cuotas ? Math.round(aFinanciar / cuotas) : 0;
  const saldoContado = Math.max(0, vPrecioARS - seniaNum);
  const saldoTrasCanje = Math.max(0, vPrecioARS - canjeNum);

  const cq = clienteSearch.trim().toLowerCase();
  const clienteMatches = clientes.filter(c => !cq || (c.nombre + ' ' + c.dni).toLowerCase().includes(cq)).slice(0, 5);
  const canConfirm = !!selEq && !!cliente;

  const handlePickCuotas = (n) => { setCuotas(n); setCuotasCustom(false); };
  const handleCuotasInput = (v) => { const n = parseInt(v) || 0; setCuotas(n); };

  const handleSelectCliente = (c) => { setCliente(c.nombre); setClienteId(c.id); setClienteSearch(''); };

  const handleNuevoCliente = (data) => {
    const nuevo = onAddCliente(data);
    setCliente(nuevo.nombre);
    setClienteId(nuevo.id);
    setClienteSearch('');
    setNuevoClienteModal(false);
  };

  const buildVentaData = () => ({
    equipo: [selEq.modelo, selEq.cap, selEq.color].filter(Boolean).join(' · '),
    imei: selEq.imei || '',
    categoria: selEq.categoria,
    cliente,
    usd: vPrecioUSD,
    costo: selEq.costo || null,
    tc: TC,
    modalidad: esCuotas ? 'cuotas' : (tieneApartado ? 'apartado' : 'contado'),
    cuotas: esCuotas ? cuotas : null,
    anticipo: esCuotas ? antNum : (tieneApartado ? seniaNum : null),
    metodo,
    cuotaMonto: esCuotas ? cuotaMonto : null,
    canje,
    canjeEquipo: canje ? canjeEquipo : null,
    canjeValor: canje ? canjeNum : null,
  });

  const stepLabel = () => ({ ...MONO(11, '#74a8d6'), border: '1px solid rgba(116,168,214,0.4)', borderRadius: 6, padding: '2px 7px' });
  const pillSel = { padding: '16px', borderRadius: 13, background: 'rgba(116,168,214,0.12)', border: '1px solid rgba(116,168,214,0.5)', textAlign: 'left' };
  const pillUnsel = { padding: '16px', borderRadius: 13, background: 'rgba(231,238,246,0.02)', border: '1px solid rgba(231,238,246,0.09)', textAlign: 'left' };
  const inputStyle = { width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)', color: '#eef2f7', fontSize: 14 };

  return (
    <div>
      {nuevoClienteModal && (
        <NuevoClienteModal nombre={clienteSearch} onSave={handleNuevoCliente} onClose={() => setNuevoClienteModal(false)} />
      )}

      <div style={{ marginBottom: 28 }}>
        <div style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Nueva operación</div>
        <h1 style={{ margin: 0, fontSize: 33, fontWeight: 600, letterSpacing: -0.5 }}>
          Registrar una <span style={SERIF(33, '#9ec6ec')}>venta</span>
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.42fr) minmax(0,1fr)', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>

          {/* Step 01 – Equipo */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 15 }}>
              <span style={stepLabel()}>01</span>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>Equipo</span>
              {selEq && <span style={{ fontSize: 12.5, color: '#82b39d', marginLeft: 'auto' }}>✓ {selEq.modelo} seleccionado</span>}
            </div>
            <EquipoPicker equipos={equipos} value={equipoId} onChange={setEquipoId} />
          </div>

          {/* Step 02 – Cliente */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 15 }}>
              <span style={stepLabel()}>02</span>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>Cliente</span>
              {cliente && <span style={{ fontSize: 12.5, color: '#82b39d', marginLeft: 'auto' }}>✓ {cliente}</span>}
            </div>
            {!cliente ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '11px 15px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.08)' }}>
                  <span style={{ color: '#6a717b', fontSize: 14 }}>⌕</span>
                  <input value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} placeholder="Buscar por nombre o DNI…" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 13.5 }} autoFocus={false} />
                  {clienteSearch && <button onClick={() => setClienteSearch('')} style={{ background: 'none', border: 'none', color: '#6a717b', cursor: 'pointer', fontSize: 15, padding: 0 }}>×</button>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {clienteMatches.map(c => (
                    <button key={c.id} onClick={() => handleSelectCliente(c)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '11px 15px', borderRadius: 11, border: '1px solid rgba(231,238,246,0.08)', background: 'rgba(231,238,246,0.02)', cursor: 'pointer' }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(116,168,214,0.14)', color: '#9ec6ec', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{c.inicial}</span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#eef2f7' }}>{c.nombre}</span>
                      <span style={{ ...MONO(12), color: '#828a94' }}>DNI {c.dni}</span>
                    </button>
                  ))}
                  <button onClick={() => setNuevoClienteModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 15px', borderRadius: 11, border: '1px dashed rgba(116,168,214,0.3)', background: 'rgba(116,168,214,0.04)', color: '#74a8d6', fontSize: 13.5, cursor: 'pointer', alignSelf: 'flex-start' }}>
                    + Registrar como cliente nuevo{clienteSearch ? ` "${clienteSearch}"` : ''}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 11, border: '1px solid rgba(116,168,214,0.3)', background: 'rgba(116,168,214,0.06)' }}>
                <span style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7' }}>{cliente}</span>
                <button onClick={() => { setCliente(''); setClienteId(null); }} style={{ background: 'none', border: 'none', color: '#6a717b', cursor: 'pointer', fontSize: 13 }}>Cambiar</button>
              </div>
            )}
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
                  <button key={key} onClick={() => { setModalidad(key); setTieneApartado(false); }} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                    <div style={sel ? pillSel : pillUnsel}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: sel ? '#eef2f7' : '#a6afba' }}>{title}</div>
                      <div style={{ fontSize: 12.5, color: sel ? '#93b8da' : '#828a94', marginTop: 2 }}>{sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Contado: opción apartado */}
            {!esCuotas && (
              <div style={{ padding: 18, borderRadius: 13, border: '1px solid rgba(231,238,246,0.07)', background: 'rgba(231,238,246,0.015)', marginBottom: 4 }}>
                <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>¿El cliente paga ahora?</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[[false,'Sí, pago total','El cliente se lleva el equipo hoy'],[true,'Apartado con seña','El cliente paga una parte y busca el equipo después']].map(([val, t, sub]) => {
                    const sel = tieneApartado === val;
                    return (
                      <button key={String(val)} onClick={() => setTieneApartado(val)} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                        <div style={{ padding: '13px 14px', borderRadius: 11, background: sel ? 'rgba(116,168,214,0.1)' : 'rgba(231,238,246,0.02)', border: `1px solid ${sel ? 'rgba(116,168,214,0.4)' : 'rgba(231,238,246,0.08)'}`, textAlign: 'left' }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: sel ? '#eef2f7' : '#a6afba' }}>{t}</div>
                          <div style={{ fontSize: 11.5, color: sel ? '#93b8da' : '#6a717b', marginTop: 3, lineHeight: 1.4 }}>{sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {tieneApartado && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 9 }}>Seña / Señal (ARS)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 15px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)' }}>
                      <span style={{ color: '#828a94', fontSize: 15 }}>$</span>
                      <input type="text" inputMode="numeric" value={seniaContado} onChange={e => setSeniaContado(e.target.value.replace(/[^0-9]/g,''))} placeholder="0" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 15, fontWeight: 500 }} />
                    </div>
                    {seniaNum > 0 && vPrecioARS > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(116,168,214,0.06)', border: '1px solid rgba(116,168,214,0.15)' }}>
                        <span style={{ fontSize: 13, color: '#a6afba' }}>Saldo pendiente al retirar</span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#9ec6ec', whiteSpace: 'nowrap' }}>{fARS(saldoContado)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Cuotas */}
            {esCuotas && (
              <div style={{ padding: 18, borderRadius: 13, border: '1px solid rgba(231,238,246,0.07)', background: 'rgba(231,238,246,0.015)' }}>
                <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 11 }}>Cantidad de cuotas</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[3, 6, 9, 12].map(n => (
                    <button key={n} onClick={() => handlePickCuotas(n)} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                      <div style={{ padding: '11px 0', borderRadius: 10, background: !cuotasCustom && cuotas === n ? '#74a8d6' : 'rgba(231,238,246,0.04)', color: !cuotasCustom && cuotas === n ? '#14171c' : '#a6afba', fontSize: 14, fontWeight: !cuotasCustom && cuotas === n ? 600 : 500, textAlign: 'center' }}>{n}</div>
                    </button>
                  ))}
                  <button onClick={() => setCuotasCustom(true)} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                    <div style={{ padding: '11px 0', borderRadius: 10, background: cuotasCustom ? 'rgba(116,168,214,0.15)' : 'rgba(231,238,246,0.04)', color: cuotasCustom ? '#74a8d6' : '#a6afba', fontSize: 13, fontWeight: cuotasCustom ? 600 : 500, textAlign: 'center', border: cuotasCustom ? '1px solid rgba(116,168,214,0.4)' : '1px solid transparent' }}>Otra</div>
                  </button>
                </div>
                {cuotasCustom && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 9 }}>Cantidad personalizada</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 15px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(116,168,214,0.3)' }}>
                      <input type="number" min="1" max="60" value={cuotas || ''} onChange={e => handleCuotasInput(e.target.value)} placeholder="ej. 18" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 15, fontWeight: 500 }} />
                      <span style={{ fontSize: 13, color: '#828a94' }}>cuotas</span>
                    </div>
                  </div>
                )}
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
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>Método de pago</span>
            </div>

            {/* Toggle Plan Canje */}
            <button
              onClick={() => { setCanje(!canje); setCanjeEquipo(''); setCanjeValor(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '13px 16px', borderRadius: 12, border: `1px solid ${canje ? 'rgba(166,175,186,0.5)' : 'rgba(231,238,246,0.1)'}`, background: canje ? 'rgba(166,175,186,0.1)' : 'rgba(231,238,246,0.02)', cursor: 'pointer', marginBottom: 16 }}
            >
              <span style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${canje ? '#a6afba' : 'rgba(231,238,246,0.25)'}`, background: canje ? 'rgba(166,175,186,0.3)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {canje && <span style={{ fontSize: 11, color: '#eef2f7', fontWeight: 700 }}>✓</span>}
              </span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: canje ? '#eef2f7' : '#a6afba' }}>Plan canje</div>
                <div style={{ fontSize: 11.5, color: canje ? '#a6afba' : '#6a717b', marginTop: 1 }}>El cliente entrega un equipo como parte del pago</div>
              </div>
            </button>

            {/* Detalle del canje */}
            {canje && (
              <div style={{ padding: 18, borderRadius: 13, border: '1px solid rgba(166,175,186,0.2)', background: 'rgba(166,175,186,0.04)', marginBottom: 16 }}>
                <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 9 }}>Equipo entregado en canje</div>
                <input
                  value={canjeEquipo}
                  onChange={e => setCanjeEquipo(e.target.value)}
                  placeholder="ej. iPhone 13 · 128 GB · Negro"
                  style={inputStyle}
                />
                <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 16, marginBottom: 9 }}>Valor del equipo (ARS)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 15px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)' }}>
                  <span style={{ color: '#828a94', fontSize: 15 }}>$</span>
                  <input type="text" inputMode="numeric" value={canjeValor} onChange={e => setCanjeValor(e.target.value.replace(/[^0-9]/g,''))} placeholder="0" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 15, fontWeight: 500 }} />
                </div>
                {canjeNum > 0 && vPrecioARS > 0 && (
                  <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#828a94', marginBottom: 6 }}>
                      <span>Precio del equipo</span><span>{fARS(vPrecioARS)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#82b39d', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
                      <span>− Canje</span><span>−{fARS(canjeNum)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: '#eef2f7' }}>
                      <span>Saldo a cobrar</span><span>{fARS(saldoTrasCanje)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, color: '#6a717b' }}>
              {canje && canjeNum > 0 ? 'Método para el saldo' : 'Forma de pago'}
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              {['Transferencia','Débito','Crédito','Efectivo'].map(m => {
                const sel = metodo === m;
                return (
                  <button key={m} onClick={() => setMetodo(m)} style={{ flex: 1, cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                    <div style={{ padding: '12px 8px', borderRadius: 11, background: sel ? 'rgba(116,168,214,0.14)' : 'rgba(231,238,246,0.03)', border: `1px solid ${sel ? 'rgba(116,168,214,0.45)' : 'rgba(231,238,246,0.08)'}`, color: sel ? '#eef2f7' : '#828a94', fontSize: 13, fontWeight: sel ? 600 : 500, textAlign: 'center' }}>{m}</div>
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
            <div style={{ fontSize: 13, color: '#828a94', marginTop: 2 }}>{selEq ? `${selEq.cap}${selEq.cap ? ' · ' : ''}${selEq.color}` : 'Pendiente de selección'}</div>
            {selEq && esPhone(selEq.categoria) && selEq.imei && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
                <span style={{ ...MONO(10, '#6a717b'), letterSpacing: 1, textTransform: 'uppercase' }}>IMEI</span>
                <span style={{ ...MONO(12, '#a6afba') }}>{selEq.imei}</span>
              </div>
            )}
            {selEq && selEq.cond === 'Usado' && selEq.bat && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
                <span style={{ ...MONO(10, '#6a717b'), letterSpacing: 1, textTransform: 'uppercase' }}>Batería</span>
                <BatBadge bat={selEq.bat} />
              </div>
            )}
            {selEq && selEq.defectos && (
              <div style={{ marginTop: 8, padding: '7px 10px', borderRadius: 8, background: 'rgba(217,138,118,0.08)', border: '1px solid rgba(217,138,118,0.2)', fontSize: 12, color: '#e6ab98' }}>⚠ {selEq.defectos}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 14 }}>
              <span style={SERIF(34, '#f6f9fc')}>{selEq ? fUSD(vPrecioUSD) : 'US$ —'}</span>
              <span style={{ fontSize: 13, color: '#828a94' }}>{selEq ? fARS(vPrecioARS) : '—'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, padding: '18px 0', borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13.5, color: '#828a94' }}>Cliente</span>
              <span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 500 }}>{cliente || '—'}</span>
            </div>
            {canje && canjeNum > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13.5, color: '#828a94', flexShrink: 0 }}>Canje</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13.5, color: '#82b39d', fontWeight: 500, whiteSpace: 'nowrap' }}>{fARS(canjeNum)}</div>
                    {canjeEquipo && <div style={{ fontSize: 11, color: '#6a717b', marginTop: 1 }}>{canjeEquipo}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13.5, color: '#828a94' }}>Saldo · {metodo}</span>
                  <span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 500, whiteSpace: 'nowrap' }}>{fARS(saldoTrasCanje)}</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13.5, color: '#828a94' }}>Método</span>
                <span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 500 }}>{metodo}</span>
              </div>
            )}
            {!esCuotas && !tieneApartado && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13.5, color: '#828a94' }}>Modalidad</span>
                <span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 500 }}>Contado · pago total</span>
              </div>
            )}
            {!esCuotas && tieneApartado && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13.5, color: '#828a94' }}>Modalidad</span>
                  <span style={{ fontSize: 13.5, color: '#74a8d6', fontWeight: 500 }}>Apartado con seña</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13.5, color: '#828a94' }}>Seña</span>
                  <span style={{ fontSize: 13.5, color: '#eef2f7', fontWeight: 600, whiteSpace: 'nowrap' }}>{fARS(seniaNum)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13.5, color: '#828a94' }}>Saldo al retirar</span>
                  <span style={{ fontSize: 13.5, color: '#9ec6ec', fontWeight: 600, whiteSpace: 'nowrap' }}>{fARS(saldoContado)}</span>
                </div>
              </>
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

          {esCuotas && cuotas > 0 && (
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
              ? <button onClick={() => onConfirm(buildVentaData())} style={{ width: '100%', padding: 15, borderRadius: 13, border: '1px solid rgba(255,255,255,0.2)', background: 'linear-gradient(160deg, #eef2f6, #b7c3ce)', color: '#14171c', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 22px -10px rgba(180,200,220,0.7)' }}>
                {tieneApartado ? 'Registrar apartado' : 'Confirmar venta'}
              </button>
              : <div style={{ width: '100%', padding: 15, borderRadius: 13, background: 'rgba(231,238,246,0.04)', color: '#6a717b', fontSize: 15, fontWeight: 600, textAlign: 'center' }}>Elegí equipo y cliente</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
