import { useState } from 'react';
import { TODAY, DIAGNOSTICOS, fARS, fUSD, dnum, saldoDe } from '../data/data.js';
import Modal from '../components/Modal.jsx';
import VentaDetalleModal from '../components/VentaDetalleModal.jsx';
import { validateDNI, validateTel, isDNIDuplicate } from '../lib/validation.js';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });

const ESTADO_RECLAMO_COLORS = {
  'Pendiente':   { bg: 'rgba(116,168,214,0.13)', color: '#74a8d6' },
  'En gestión':  { bg: 'rgba(155,147,214,0.13)', color: '#9b93d6' },
  'Resuelto':    { bg: 'rgba(130,179,157,0.13)', color: '#82b39d' },
};

function FieldLabel({ children }) {
  return <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7, color: '#6a717b' }}>{children}</div>;
}
function FieldSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} style={{ width: '100%', padding: '11px 14px', borderRadius: 10, background: '#1e2228', border: '1px solid rgba(231,238,246,0.09)', color: '#eef2f7', fontSize: 14, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236a717b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function ReclamoModal({ compras, onSave, onClose }) {
  const [equipoIdx, setEquipoIdx] = useState(0);
  const [diagnostico, setDiagnostico] = useState(DIAGNOSTICOS[0]);
  const [otroTexto, setOtroTexto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState('Pendiente');
  const [resolucion, setResolucion] = useState('');

  const esOtro = diagnostico === 'Otro';
  const equipo = compras[equipoIdx];

  const handleSave = () => {
    const diagFinal = esOtro ? (otroTexto.trim() || 'Otro') : diagnostico;
    onSave({
      id: 'rcl' + Date.now(),
      equipoLabel: equipo?.modelo || '—',
      imei: equipo?.imei || '',
      diagnostico: diagFinal,
      descripcion,
      fecha: `${TODAY.d} jun ${TODAY.y}`,
      estado,
      resolucion,
    });
  };

  const fw = { marginBottom: 16 };
  const textarea = { width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)', color: '#eef2f7', fontSize: 14, resize: 'vertical', minHeight: 72, fontFamily: "'Hanken Grotesk', sans-serif" };

  return (
    <Modal title="Registrar reclamo" onClose={onClose} width={520}>
      {compras.length === 0 ? (
        <p style={{ color: '#6a717b', fontSize: 14 }}>El cliente no tiene equipos comprados registrados.</p>
      ) : (
        <>
          <div style={fw}>
            <FieldLabel>Equipo</FieldLabel>
            <FieldSelect value={equipoIdx} onChange={e => setEquipoIdx(Number(e.target.value))}
              options={compras.map((c, i) => [i, `${c.modelo} · ${c.cap} · ${c.fecha}`])} />
          </div>

          <div style={fw}>
            <FieldLabel>Diagnóstico</FieldLabel>
            <FieldSelect value={diagnostico} onChange={e => setDiagnostico(e.target.value)}
              options={DIAGNOSTICOS.map(d => [d, d])} />
          </div>

          {esOtro && (
            <div style={fw}>
              <FieldLabel>Describir el problema</FieldLabel>
              <input value={otroTexto} onChange={e => setOtroTexto(e.target.value)} placeholder="Describí el problema…"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)', color: '#eef2f7', fontSize: 14 }} />
            </div>
          )}

          <div style={fw}>
            <FieldLabel>Descripción adicional (opcional)</FieldLabel>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Detalles extra del reclamo…" style={textarea} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, ...fw }}>
            <div>
              <FieldLabel>Estado</FieldLabel>
              <FieldSelect value={estado} onChange={e => setEstado(e.target.value)}
                options={[['Pendiente','Pendiente'],['En gestión','En gestión'],['Resuelto','Resuelto']]} />
            </div>
            <div>
              <FieldLabel>Resolución (opcional)</FieldLabel>
              <input value={resolucion} onChange={e => setResolucion(e.target.value)} placeholder="Cambio por garantía…"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)', color: '#eef2f7', fontSize: 14 }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 11, border: '1px solid rgba(231,238,246,0.12)', background: 'none', color: '#a6afba', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSave} style={{ flex: 2, padding: 12, borderRadius: 11, border: '1px solid rgba(255,255,255,0.2)', background: 'linear-gradient(160deg, #eef2f6, #b7c3ce)', color: '#14171c', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Registrar reclamo</button>
          </div>
        </>
      )}
    </Modal>
  );
}

function UpdateReclamoModal({ reclamo, onSave, onClose }) {
  const [estado, setEstado] = useState(reclamo.estado);
  const [resolucion, setResolucion] = useState(reclamo.resolucion || '');

  const fw = { marginBottom: 16 };
  const textarea = { width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)', color: '#eef2f7', fontSize: 14, resize: 'vertical', minHeight: 90, fontFamily: "'Hanken Grotesk', sans-serif" };
  const ESTILOS = ESTADO_RECLAMO_COLORS[estado] || ESTADO_RECLAMO_COLORS['Pendiente'];

  return (
    <Modal title="Actualizar reclamo" onClose={onClose} width={460}>
      <div style={{ padding: '10px 14px', borderRadius: 11, border: '1px solid rgba(231,238,246,0.07)', background: 'rgba(231,238,246,0.02)', marginBottom: 20 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7' }}>{reclamo.diagnostico}</div>
        <div style={{ fontSize: 12, color: '#828a94', marginTop: 2 }}>{reclamo.equipoLabel} {reclamo.imei ? `· ${reclamo.imei}` : ''} · {reclamo.fecha}</div>
        {reclamo.descripcion && <div style={{ fontSize: 12.5, color: '#9aa2ad', marginTop: 6, lineHeight: 1.5 }}>{reclamo.descripcion}</div>}
      </div>

      <div style={fw}>
        <FieldLabel>Estado del reclamo</FieldLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Pendiente','En gestión','Resuelto'].map(s => {
            const sel = estado === s;
            const c = ESTADO_RECLAMO_COLORS[s];
            return (
              <button key={s} onClick={() => setEstado(s)} style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: `1px solid ${sel ? c.color : 'rgba(231,238,246,0.09)'}`, background: sel ? c.bg : 'rgba(231,238,246,0.02)', color: sel ? c.color : '#828a94', fontSize: 12.5, fontWeight: sel ? 600 : 400, cursor: 'pointer' }}>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div style={fw}>
        <FieldLabel>Resolución / notas de gestión</FieldLabel>
        <textarea value={resolucion} onChange={e => setResolucion(e.target.value)}
          placeholder={estado === 'Resuelto' ? 'Describí cómo se resolvió el reclamo…' : 'Anotá el avance o la gestión realizada…'}
          style={textarea} />
      </div>

      {estado === 'Resuelto' && resolucion.trim() && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(130,179,157,0.08)', border: '1px solid rgba(130,179,157,0.2)' }}>
          <span style={{ fontSize: 11, color: '#82b39d', fontWeight: 600 }}>Vista previa resolución</span>
          <div style={{ fontSize: 13, color: '#b6cdc1', marginTop: 4, lineHeight: 1.5 }}>{resolucion}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 11, border: '1px solid rgba(231,238,246,0.12)', background: 'none', color: '#a6afba', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={() => onSave({ estado, resolucion })} style={{ flex: 2, padding: 12, borderRadius: 11, border: `1px solid ${ESTILOS.color}`, background: ESTILOS.bg, color: ESTILOS.color, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Guardar cambios
        </button>
      </div>
    </Modal>
  );
}

function EditClienteModal({ cli, clientes, onSave, onClose }) {
  const [nombre, setNombre] = useState(cli.nombre || '');
  const [dni, setDni] = useState(cli.dni || '');
  const [tel, setTel] = useState(cli.tel || '');
  const [loc, setLoc] = useState(cli.loc || '');

  const errDni = validateDNI(dni) || (dni && isDNIDuplicate(dni, clientes, cli.id) ? 'Ya existe un cliente con ese DNI.' : null);
  const errTel = validateTel(tel);
  const canSave = nombre.trim().length > 1 && !errDni && !errTel;

  const fw = { marginBottom: 14 };
  const field = (hasErr) => ({ width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(231,238,246,0.04)', border: `1px solid ${hasErr ? 'rgba(217,138,118,0.5)' : 'rgba(231,238,246,0.09)'}`, color: '#eef2f7', fontSize: 14, boxSizing: 'border-box' });
  const lbl = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7, color: '#6a717b', display: 'block' };
  const errStyle = { fontSize: 11.5, color: '#e6ab98', marginTop: 5 };

  return (
    <Modal title="Editar cliente" onClose={onClose} width={460}>
      <div style={fw}><span style={lbl}>Nombre completo *</span><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre Apellido" style={field(false)} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, ...fw }}>
        <div>
          <span style={lbl}>DNI</span>
          <input value={dni} onChange={e => setDni(e.target.value)} placeholder="34521890" style={field(!!errDni)} />
          {errDni && <div style={errStyle}>{errDni}</div>}
        </div>
        <div>
          <span style={lbl}>Teléfono</span>
          <input value={tel} onChange={e => setTel(e.target.value)} placeholder="+54 9 3541 …" style={field(!!errTel)} />
          {errTel && <div style={errStyle}>{errTel}</div>}
        </div>
      </div>
      <div style={fw}><span style={lbl}>Localidad</span><input value={loc} onChange={e => setLoc(e.target.value)} placeholder="Villa Carlos Paz" style={field(false)} /></div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 11, border: '1px solid rgba(231,238,246,0.12)', background: 'none', color: '#a6afba', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={() => canSave && onSave({ nombre: nombre.trim(), dni, tel, loc })} disabled={!canSave}
          style={{ flex: 2, padding: 12, borderRadius: 11, border: '1px solid rgba(255,255,255,0.2)', background: canSave ? 'linear-gradient(160deg, #eef2f6, #b7c3ce)' : 'rgba(231,238,246,0.05)', color: canSave ? '#14171c' : '#6a717b', fontSize: 14, fontWeight: 600, cursor: canSave ? 'pointer' : 'default' }}>
          Guardar cambios
        </button>
      </div>
    </Modal>
  );
}

function ClienteDetail({ cli, clientes, reservas, onBack, onAddReclamo, onUpdateReclamo, onEditCliente, onDeleteCliente }) {
  const [reclamoModal, setReclamoModal] = useState(false);
  const [updateModal, setUpdateModal] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detalleCompra, setDetalleCompra] = useState(null);

  const enMora = !!(cli.plan && cli.plan.mora);
  const cliCompras = cli.compras.map(co => {
    const vig = dnum(co.gVence) >= dnum(TODAY);
    const gd = co.gVence;
    const fechaGar = `${String(gd.d).padStart(2,'0')}/${String(gd.m).padStart(2,'0')}/${gd.y}`;
    const gl = vig ? `Garantía — ${fechaGar}` : `Garantía vencida — ${fechaGar}`;
    return { ...co, garVigente: vig, garLabel: gl };
  });
  const plan = cli.plan;
  let planView = null;
  if (plan) {
    planView = {
      equipo: plan.equipo, prox: plan.prox, mora: plan.mora || '',
      tieneMora: !!plan.mora,
      restanteFmt: fARS((plan.total - plan.pagadas) * plan.monto),
      label: `${plan.pagadas} de ${plan.total} cuotas pagadas`,
      dots: Array.from({ length: plan.total }, (_, i) => ({ pagada: i < plan.pagadas })),
    };
  }
  const reservasCli = reservas.filter(r => r.cliente === cli.nombre && r.estado === 'activa');
  const reclamos = cli.reclamos || [];

  const handleSaveReclamo = (data) => {
    onAddReclamo(cli.id, data);
    setReclamoModal(false);
  };

  const handleUpdateReclamo = (updates) => {
    onUpdateReclamo(cli.id, updateModal.id, updates);
    setUpdateModal(null);
  };

  return (
    <div>
      {reclamoModal && (
        <ReclamoModal compras={cli.compras} onSave={handleSaveReclamo} onClose={() => setReclamoModal(false)} />
      )}
      {updateModal && (
        <UpdateReclamoModal reclamo={updateModal} onSave={handleUpdateReclamo} onClose={() => setUpdateModal(null)} />
      )}
      {editModal && (
        <EditClienteModal cli={cli} clientes={clientes} onSave={data => { onEditCliente(cli.id, data); setEditModal(false); }} onClose={() => setEditModal(false)} />
      )}
      {confirmDelete && (
        <Modal title="Eliminar cliente" onClose={() => setConfirmDelete(false)} width={400}>
          <div style={{ fontSize: 14.5, color: '#eef2f7', marginBottom: 8 }}>¿Eliminar a <strong>{cli.nombre}</strong>?</div>
          <div style={{ fontSize: 13, color: '#828a94', marginBottom: 22, lineHeight: 1.6 }}>
            Esta acción eliminará el cliente del sistema. Las ventas asociadas permanecerán en el historial.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: 12, borderRadius: 11, border: '1px solid rgba(231,238,246,0.12)', background: 'none', color: '#a6afba', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={() => { onDeleteCliente(cli.id); onBack(); }} style={{ flex: 2, padding: 12, borderRadius: 11, border: '1px solid rgba(217,100,80,0.4)', background: 'rgba(217,100,80,0.12)', color: '#e07060', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Eliminar cliente
            </button>
          </div>
        </Modal>
      )}

      {detalleCompra && <VentaDetalleModal venta={detalleCompra} onClose={() => setDetalleCompra(null)} />}

      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#828a94', fontSize: 13.5, marginBottom: 18, padding: 0 }}>‹ Volver al directorio</button>

      {/* Header card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 32px', borderRadius: 20, border: '1px solid rgba(116,168,214,0.2)', background: 'linear-gradient(160deg, rgba(116,168,214,0.07), #181b20 55%)', marginBottom: 16, flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ width: 66, height: 66, borderRadius: '50%', border: '1px solid rgba(116,168,214,0.4)', background: 'rgba(116,168,214,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={SERIF(30, '#9ec6ec')}>{cli.inicial}</span>
          </div>
          <div>
            <div style={SERIF(33)}>{cli.nombre}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 11, flexWrap: 'wrap' }}>
              <span style={{ ...MONO(12, '#a6afba') }}>DNI {cli.dni}</span>
              <span style={{ color: '#3a4047' }}>·</span>
              <span style={{ fontSize: 13, color: '#a6afba' }}>{cli.loc}</span>
              <span style={{ color: '#3a4047' }}>·</span>
              <span style={{ fontSize: 13, color: '#a6afba' }}>Cliente desde {cli.desde}</span>
              <span style={{ ...MONO(12) }}>{cli.tel}</span>
              {!enMora
                ? <span style={{ fontSize: 12, color: '#b6cdc1', padding: '3px 11px', borderRadius: 20, background: 'rgba(130,179,157,0.13)' }}>Al día</span>
                : <span style={{ fontSize: 12, color: '#d98a76', padding: '3px 11px', borderRadius: 20, background: 'rgba(217,138,118,0.13)' }}>En mora</span>
              }
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditModal(true)} style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(231,238,246,0.15)', background: 'rgba(231,238,246,0.04)', color: '#a6afba', fontSize: 12.5, cursor: 'pointer' }}>✏ Editar</button>
            <button onClick={() => setConfirmDelete(true)} style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(217,100,80,0.3)', background: 'rgba(217,100,80,0.06)', color: '#e07060', fontSize: 12.5, cursor: 'pointer' }}>✕ Eliminar</button>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>Saldo pendiente</div>
            <div style={SERIF(38, '#9ec6ec')}>{fARS(saldoDe(cli))}</div>
            <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 7 }}>Total comprado · {fUSD(cli.compras.reduce((a, b) => a + b.usd, 0))}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
        {/* Left: compras + reclamos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Equipos comprados */}
          <div style={{ padding: '26px 28px', borderRadius: 20, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20' }}>
            <span style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase' }}>Equipos comprados · {cliCompras.length}</span>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cliCompras.length === 0 && <div style={{ paddingTop: 16, color: '#6a717b', fontSize: 13.5 }}>Todavía sin compras registradas.</div>}
              {cliCompras.map((co, i) => {
                const esMulti = co.lineas && co.lineas.length > 1;
                return (
                  <div key={i} onClick={() => setDetalleCompra(co)} style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid rgba(231,238,246,0.07)', background: 'rgba(231,238,246,0.015)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 15.5, fontWeight: 600, color: '#eef2f7' }}>{co.modelo}</span>
                          {esMulti && (
                            <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 5, background: 'rgba(116,168,214,0.12)', border: '1px solid rgba(116,168,214,0.3)', color: '#74a8d6', whiteSpace: 'nowrap' }}>
                              {co.lineas.length} productos
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 2 }}>{co.cap}{co.color ? ` · ${co.color}` : ''}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{fUSD(co.usd)}</div>
                        <div style={{ fontSize: 12, color: '#828a94', marginTop: 1, whiteSpace: 'nowrap' }}>{co.fecha}</div>
                        <div style={{ fontSize: 11, color: '#6a717b', marginTop: 3 }}>Ver detalle →</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 13, paddingTop: 13, borderTop: '1px solid rgba(231,238,246,0.06)', flexWrap: 'wrap' }}>
                      {co.imei && <span style={{ ...MONO(11.5) }}>{co.imei}</span>}
                      <span style={{ fontSize: 12, color: '#a6afba' }}>{co.cond}{co.bat ? ` · batería ${co.bat}%` : ' · sellado'}</span>
                      <div style={{ flex: 1 }} />
                      {co.garantiaUrl && co.garantiaUrl.split('|').filter(Boolean).map((url, gi) => (
                        <a key={gi} href={url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#74a8d6', padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(116,168,214,0.3)', background: 'rgba(116,168,214,0.06)', textDecoration: 'none' }}>
                          ↗ {co.garantiaNombre ? co.garantiaNombre.split('|')[gi] || `Garantía ${gi+1}` : `Garantía ${gi+1}`}
                        </a>
                      ))}
                      {co.garVigente
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#82b39d' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#82b39d', display: 'inline-block' }} />{co.garLabel}</span>
                        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#d98a76' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d98a76', display: 'inline-block' }} />{co.garLabel}</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reclamos */}
          <div style={{ padding: '26px 28px', borderRadius: 20, border: reclamos.length > 0 ? '1px solid rgba(217,138,118,0.2)' : '1px solid rgba(231,238,246,0.08)', background: reclamos.length > 0 ? 'linear-gradient(160deg, rgba(217,138,118,0.05), #181b20 60%)' : '#181b20' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase', color: reclamos.length > 0 ? '#d98a76' : '#828a94' }}>
                Reclamos {reclamos.length > 0 && `· ${reclamos.length}`}
              </span>
              {cli.compras.length > 0 && (
                <button onClick={() => setReclamoModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(231,238,246,0.12)', background: 'rgba(231,238,246,0.04)', color: '#a6afba', fontSize: 12.5, cursor: 'pointer' }}>
                  + Registrar reclamo
                </button>
              )}
            </div>

            {reclamos.length === 0 && (
              <div style={{ color: '#6a717b', fontSize: 13.5 }}>Sin reclamos registrados.</div>
            )}
            {reclamos.map((r, i) => {
              const estilos = ESTADO_RECLAMO_COLORS[r.estado] || ESTADO_RECLAMO_COLORS['Pendiente'];
              const resuelto = r.estado === 'Resuelto';
              return (
                <div key={r.id || i} style={{ padding: '16px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(231,238,246,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7' }}>{r.diagnostico}</div>
                      <div style={{ fontSize: 12, color: '#828a94', marginTop: 3 }}>{r.equipoLabel} {r.imei ? `· ${r.imei}` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, ...estilos }}>{r.estado}</span>
                      <span style={{ ...MONO(10.5), color: '#6a717b' }}>{r.fecha}</span>
                      {!resuelto && (
                        <button onClick={() => setUpdateModal(r)} style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(231,238,246,0.12)', background: 'rgba(231,238,246,0.04)', color: '#a6afba', cursor: 'pointer' }}>
                          Actualizar
                        </button>
                      )}
                      {resuelto && (
                        <button onClick={() => setUpdateModal(r)} style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(130,179,157,0.2)', background: 'rgba(130,179,157,0.06)', color: '#82b39d', cursor: 'pointer' }}>
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                  {r.descripcion && <div style={{ fontSize: 13, color: '#9aa2ad', lineHeight: 1.5, marginTop: 8 }}>{r.descripcion}</div>}
                  {r.resolucion && (
                    <div style={{ marginTop: 8, padding: '9px 12px', borderRadius: 9, background: 'rgba(130,179,157,0.08)', border: '1px solid rgba(130,179,157,0.18)' }}>
                      <span style={{ fontSize: 11, color: '#82b39d', fontWeight: 500 }}>Resolución: </span>
                      <span style={{ fontSize: 13, color: '#b6cdc1' }}>{r.resolucion}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Plan de cuotas */}
          <div style={{ padding: '26px 28px', borderRadius: 20, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20' }}>
            <span style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase' }}>Plan de cuotas</span>
            {planView ? (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#eef2f7' }}>{planView.equipo}</div>
                <div style={{ display: 'flex', gap: 6, margin: '16px 0 11px' }}>
                  {planView.dots.map((d, i) => (
                    <span key={i} style={{ flex: 1, height: 8, borderRadius: 4, display: 'inline-block', background: d.pagada ? '#74a8d6' : 'rgba(231,238,246,0.08)' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#a6afba' }}>{planView.label}</span>
                  <span style={{ fontSize: 13, color: '#74a8d6' }}>Próxima · {planView.prox}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, marginTop: 16, borderTop: '1px solid rgba(231,238,246,0.07)' }}>
                  <span style={{ fontSize: 13.5, color: '#828a94' }}>Resta pagar</span>
                  <span style={SERIF(24)}>{planView.restanteFmt}</span>
                </div>
                {planView.tieneMora && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 15, padding: '11px 14px', borderRadius: 11, background: 'rgba(217,138,118,0.1)', border: '1px solid rgba(217,138,118,0.25)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d98a76', display: 'inline-block' }} />
                    <span style={{ fontSize: 12.5, color: '#e6ab98' }}>Cuota del {planView.mora} vencida sin gestionar</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 14, paddingTop: 16, color: '#6a717b', fontSize: 13.5 }}>Sin financiación activa. Compras al contado.</div>
            )}
          </div>

          {/* Reservas */}
          <div style={{ padding: '26px 28px', borderRadius: 20, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20' }}>
            <span style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase' }}>Reservas</span>
            {reservasCli.length > 0 ? (
              <div style={{ marginTop: 14 }}>
                {reservasCli.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderTop: '1px solid rgba(231,238,246,0.06)' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#eef2f7' }}>{r.equipo}</div>
                      <div style={{ fontSize: 12, color: '#828a94', marginTop: 1 }}>Reservado {r.fecha}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: '#74a8d6', whiteSpace: 'nowrap' }}>{fARS(r.sena)}</div>
                      <div style={{ fontSize: 11, color: '#828a94' }}>seña</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 14, paddingTop: 16, color: '#6a717b', fontSize: 13.5 }}>Sin reservas activas.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Clientes({ clientes, reservas, onAddReclamo, onUpdateReclamo, onEditCliente, onDeleteCliente }) {
  const [view, setView] = useState('list');
  const [clienteId, setClienteId] = useState(null);
  const [search, setSearch] = useState('');

  const openCliente = (id) => { setClienteId(id); setView('detail'); };
  const goBack = () => setView('list');

  const q = search.trim().toLowerCase();
  const clienteRows = clientes.filter(c => !q || (c.nombre + ' ' + c.dni).toLowerCase().includes(q));

  if (view === 'detail') {
    const cli = clientes.find(c => c.id === clienteId);
    if (!cli) return <div style={{ padding: 40, color: '#6a717b', textAlign: 'center' }}>Cliente no encontrado.</div>;
    return (
      <ClienteDetail
        cli={cli}
        clientes={clientes}
        reservas={reservas}
        onBack={goBack}
        onAddReclamo={onAddReclamo}
        onUpdateReclamo={onUpdateReclamo}
        onEditCliente={onEditCliente}
        onDeleteCliente={onDeleteCliente}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Directorio</div>
          <h1 style={{ margin: 0, fontSize: 33, fontWeight: 600, letterSpacing: -0.5 }}>
            Cartera de <span style={SERIF(33, '#9ec6ec')}>clientes</span>
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 320, maxWidth: '100%', padding: '11px 15px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.08)' }}>
          <div style={{ width: 13, height: 13, border: '1.5px solid #6a717b', borderRadius: '50%', position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', width: 5, height: 1.5, background: '#6a717b', transform: 'rotate(45deg)', bottom: -2, right: -3 }} />
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o DNI…" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 13.5 }} />
          <span style={{ ...MONO(11) }}>{clienteRows.length}</span>
        </div>
      </div>

      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 1.3fr 0.7fr 1fr 0.9fr', gap: 16, padding: '0 20px 11px', borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
        {[['Cliente','left'],['DNI','left'],['Localidad','left'],['Equipos','center'],['Saldo','right'],['Estado','right']].map(([h, align]) => (
          <span key={h} style={{ ...MONO(10, '#6a717b'), letterSpacing: 1.5, textTransform: 'uppercase', textAlign: align }}>{h}</span>
        ))}
      </div>

      <div>
        {clienteRows.map(c => {
          const enMora = !!(c.plan && c.plan.mora);
          const tieneReclamos = (c.reclamos || []).length > 0;
          return (
            <button key={c.id} onClick={() => openCliente(c.id)} style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 1.3fr 0.7fr 1fr 0.9fr', gap: 16, alignItems: 'center', padding: '14px 20px', border: 'none', borderBottom: '1px solid rgba(231,238,246,0.05)', borderRadius: 12, background: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(116,168,214,0.13)', color: '#9ec6ec', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{c.inicial}</span>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7' }}>{c.nombre}</div>
                  {tieneReclamos && <div style={{ fontSize: 11, color: '#d98a76', marginTop: 1 }}>{c.reclamos.length} reclamo{c.reclamos.length !== 1 ? 's' : ''}</div>}
                </div>
              </div>
              <span style={{ ...MONO(12.5, '#a6afba') }}>{c.dni}</span>
              <span style={{ fontSize: 13.5, color: '#828a94' }}>{c.loc}</span>
              <span style={{ fontSize: 13.5, color: '#a6afba', textAlign: 'center' }}>{c.compras.length}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#eef2f7', textAlign: 'right', whiteSpace: 'nowrap' }}>{fARS(saldoDe(c))}</span>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {!enMora
                  ? <span style={{ fontSize: 11.5, color: '#b6cdc1', padding: '3px 10px', borderRadius: 20, background: 'rgba(130,179,157,0.12)' }}>Al día</span>
                  : <span style={{ fontSize: 11.5, color: '#d98a76', padding: '3px 10px', borderRadius: 20, background: 'rgba(217,138,118,0.13)' }}>En mora</span>
                }
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
