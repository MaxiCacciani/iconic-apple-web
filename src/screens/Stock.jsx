import { useState, useEffect } from 'react';
import { CATEGORIAS, esPhone, DEFECTOS_COMUNES, fARS, fUSD, batColor, getModelos, getCaps, getColores, PROVEEDORES } from '../data/data.js';
import Modal from '../components/Modal.jsx';
import { validateIMEI, isIMEIDuplicate, validatePrecio, validateCosto, validateBat, validateCantidad } from '../lib/validation.js';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });

const EMPTY_FORM = {
  categoria: 'iPhone', modelo: '', cap: '', color: '',
  cond: 'Nuevo', bat: '', imei: '', defectos: '', usd: '', costo: '', proveedor: '',
  estado: 'disponible', cantidad: 1,
};

function FieldLabel({ children }) {
  return <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7, color: '#6a717b' }}>{children}</div>;
}

function FieldInput({ value, onChange, placeholder, type = 'text', style = {} }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      onWheel={type === 'number' ? e => e.target.blur() : undefined}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '11px 14px', borderRadius: 10,
        background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)',
        color: '#eef2f7', fontSize: 14, ...style,
      }}
    />
  );
}

const selectStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  background: '#1e2228', border: '1px solid rgba(231,238,246,0.09)',
  color: '#eef2f7', fontSize: 14, appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236a717b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
};

function FieldSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} style={selectStyle}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

// Combo = select de opciones predefinidas + campo libre si elige "Otro"
function FieldCombo({ value, onChange, options, placeholder = '' }) {
  const [otroMode, setOtroMode] = useState(false);
  // Cuando cambian las opciones (ej: cambio de categoría), resetear modo "otro"
  useEffect(() => { setOtroMode(false); }, [options]);

  const isCustom = value !== '' && !options.includes(value);
  const showInput = otroMode || isCustom;
  const selectVal = showInput ? '__otro__' : value;

  return (
    <>
      <select
        value={selectVal}
        onChange={e => {
          if (e.target.value === '__otro__') { setOtroMode(true); onChange(''); }
          else { setOtroMode(false); onChange(e.target.value); }
        }}
        style={{ ...selectStyle, color: selectVal === '' ? '#6a717b' : '#eef2f7' }}
      >
        <option value="">— Seleccionar —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__otro__">Otro…</option>
      </select>
      {showInput && (
        <div style={{ marginTop: 8 }}>
          <FieldInput value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        </div>
      )}
    </>
  );
}

function findDuplicateAccesorio(equipos, form) {
  if (esPhone(form.categoria) || !form.modelo?.trim()) return null;
  const norm = s => (s || '').trim().toLowerCase();
  return equipos.find(e =>
    !esPhone(e.categoria) &&
    e.estado === (form.estado || 'disponible') &&
    e.categoria === form.categoria &&
    norm(e.modelo) === norm(form.modelo) &&
    norm(e.cap)    === norm(form.cap) &&
    norm(e.color)  === norm(form.color) &&
    e.cond === form.cond
  ) || null;
}

function StockModal({ initial, equipos, onSave, onClose }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial
    ? { costo: '', proveedor: '', ...initial, bat: initial.bat ?? '', usd: initial.usd ?? '', defectos: initial.defectos ?? '' }
    : { ...EMPTY_FORM }
  );
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const phone = esPhone(form.categoria);
  const duplicado = !isEdit ? findDuplicateAccesorio(equipos, form) : null;

  const getErrors = () => {
    const errs = [];
    if (!form.modelo.trim()) errs.push('El modelo es obligatorio.');
    const ep = validatePrecio(form.usd);
    if (ep) errs.push(ep);
    const ec = validateCosto(form.costo, form.usd);
    if (ec) errs.push(ec);
    if (phone) {
      const ei = validateIMEI(form.imei, true);
      if (ei) errs.push(ei);
      else if (isIMEIDuplicate(form.imei, equipos, isEdit ? initial.id : null))
        errs.push('Ya existe un equipo en el stock con ese IMEI.');
      if (form.cond === 'Usado') {
        const eb = validateBat(form.bat);
        if (eb) errs.push(eb);
      }
    } else {
      const eq = validateCantidad(form.cantidad);
      if (eq) errs.push(eq);
    }
    return errs;
  };
  const errors = getErrors();
  const canSave = errors.length === 0;

  const modelosList  = getModelos(form.categoria);
  const capsList     = getCaps(form.categoria);
  const coloresList  = getColores(form.categoria);

  const handleCategoriaChange = (cat) => {
    setForm(f => ({ ...f, categoria: cat, modelo: '', cap: '', color: '' }));
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      ...form,
      usd: parseFloat(form.usd) || 0,
      costo: form.costo !== '' ? (parseFloat(form.costo) || null) : null,
      bat: phone && form.cond === 'Usado' ? (parseInt(form.bat) || null) : null,
      imei: phone ? (form.imei || '').replace(/[\s\-]/g, '') : '',
      cantidad: phone ? 1 : (parseInt(form.cantidad) || 1),
      proveedor: form.proveedor || '',
    });
  };

  const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 };
  const fieldWrap = { marginBottom: 16 };

  const costoNum = parseFloat(form.costo) || 0;
  const usdNum   = parseFloat(form.usd)   || 0;
  const ganancia = usdNum - costoNum;
  const margen   = costoNum > 0 && usdNum > 0 ? Math.round((ganancia / costoNum) * 100) : null;

  return (
    <Modal title={isEdit ? 'Editar producto' : 'Agregar producto'} onClose={onClose} width={600}>
      <div style={fieldWrap}>
        <FieldLabel>Categoría</FieldLabel>
        <FieldSelect value={form.categoria} onChange={e => handleCategoriaChange(e.target.value)}
          options={CATEGORIAS.map(c => [c, c])} />
      </div>

      <div style={fieldWrap}>
        <FieldLabel>Modelo</FieldLabel>
        {modelosList
          ? <FieldCombo value={form.modelo} onChange={v => set('modelo', v)} options={modelosList} placeholder="ej. iPhone 16 Pro Max" />
          : <FieldInput value={form.modelo} onChange={e => set('modelo', e.target.value)} placeholder="Descripción del producto" />
        }
      </div>

      <div style={{ ...row2, ...fieldWrap }}>
        <div>
          <FieldLabel>{phone ? 'Almacenamiento' : 'Especificación'}</FieldLabel>
          {capsList
            ? <FieldCombo value={form.cap} onChange={v => set('cap', v)} options={capsList} placeholder="256 GB" />
            : <FieldInput value={form.cap} onChange={e => set('cap', e.target.value)} placeholder="20W, 1m…" />
          }
        </div>
        <div>
          <FieldLabel>Color</FieldLabel>
          {coloresList
            ? <FieldCombo value={form.color} onChange={v => set('color', v)} options={coloresList} placeholder="Titanio Natural…" />
            : <FieldInput value={form.color} onChange={e => set('color', e.target.value)} placeholder="Color…" />
          }
        </div>
      </div>

      <div style={{ ...row2, ...fieldWrap }}>
        <div>
          <FieldLabel>Condición</FieldLabel>
          <FieldSelect value={form.cond} onChange={e => set('cond', e.target.value)}
            options={[['Nuevo','Nuevo'],['Usado','Usado']]} />
        </div>
        {phone && form.cond === 'Usado' ? (
          <div>
            <FieldLabel>Batería (%)</FieldLabel>
            <FieldInput type="number" value={form.bat} onChange={e => set('bat', e.target.value)} placeholder="85" />
          </div>
        ) : !phone ? (
          <div>
            <FieldLabel>Cantidad</FieldLabel>
            <FieldInput type="number" value={form.cantidad} onChange={e => set('cantidad', e.target.value)} placeholder="1" />
          </div>
        ) : <div />}
      </div>

      {phone && (
        <div style={fieldWrap}>
          <FieldLabel>IMEI</FieldLabel>
          <FieldInput value={form.imei} onChange={e => set('imei', e.target.value)} placeholder="356938 11 240517 4"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }} />
        </div>
      )}

      {phone && form.cond === 'Usado' && (
        <div style={fieldWrap}>
          <FieldLabel>Desperfectos / detalles físicos (opcional)</FieldLabel>
          <FieldSelect value={form.defectos || ''} onChange={e => set('defectos', e.target.value)}
            options={[['', 'Sin desperfectos'], ...DEFECTOS_COMUNES.map(d => [d, d])]} />
          {form.defectos && form.defectos !== '' && (
            <div style={{ marginTop: 8 }}>
              <FieldInput value={form.defectos} onChange={e => set('defectos', e.target.value)}
                placeholder="Describí el desperfecto…" />
            </div>
          )}
        </div>
      )}

      {/* Precio, Costo y Margen */}
      <div style={{ ...row2, ...fieldWrap }}>
        <div>
          <FieldLabel>Precio de venta (USD)</FieldLabel>
          <FieldInput type="number" value={form.usd} onChange={e => set('usd', e.target.value)} placeholder="950" />
        </div>
        <div>
          <FieldLabel>Costo (USD)</FieldLabel>
          <FieldInput type="number" value={form.costo} onChange={e => set('costo', e.target.value)} placeholder="750" />
        </div>
      </div>

      {costoNum > 0 && usdNum > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: -8, marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: ganancia >= 0 ? 'rgba(130,179,157,0.07)' : 'rgba(217,138,118,0.07)', border: `1px solid ${ganancia >= 0 ? 'rgba(130,179,157,0.2)' : 'rgba(217,138,118,0.2)'}` }}>
          <span style={{ fontSize: 12.5, color: '#828a94' }}>Ganancia</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: ganancia >= 0 ? '#82b39d' : '#d98a76' }}>
            {ganancia >= 0 ? '+' : ''}US$ {Math.round(ganancia).toLocaleString('es-AR')}
          </span>
          {margen !== null && <span style={{ fontSize: 12, color: ganancia >= 0 ? '#82b39d' : '#d98a76' }}>({margen}%)</span>}
        </div>
      )}

      <div style={{ ...row2, ...fieldWrap }}>
        <div>
          <FieldLabel>Proveedor</FieldLabel>
          <FieldCombo value={form.proveedor} onChange={v => set('proveedor', v)} options={PROVEEDORES} placeholder="Nombre del proveedor…" />
        </div>
        <div>
          <FieldLabel>Estado</FieldLabel>
          <FieldSelect value={form.estado} onChange={e => set('estado', e.target.value)}
            options={[['disponible','Disponible'],['reservado','Reservado'],['vendido','Vendido']]} />
        </div>
      </div>

      {duplicado && (
        <div style={{ marginBottom: 14, padding: '12px 15px', borderRadius: 10, background: 'rgba(116,168,214,0.07)', border: '1px solid rgba(116,168,214,0.3)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>ℹ</span>
          <div>
            <div style={{ fontSize: 13, color: '#9ec6ec', fontWeight: 600, marginBottom: 2 }}>Ya existe este producto en stock</div>
            <div style={{ fontSize: 12.5, color: '#a6afba', lineHeight: 1.5 }}>
              Hay <strong style={{ color: '#eef2f7' }}>{duplicado.cantidad} ud{duplicado.cantidad !== 1 ? 's.' : '.'}</strong> disponibles.
              {' '}Al confirmar se sumarán <strong style={{ color: '#eef2f7' }}>{parseInt(form.cantidad) || 1} más</strong> → total <strong style={{ color: '#82b39d' }}>{duplicado.cantidad + (parseInt(form.cantidad) || 1)} uds.</strong>
            </div>
          </div>
        </div>
      )}
      {errors.length > 0 && (
        <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 10, background: 'rgba(217,138,118,0.08)', border: '1px solid rgba(217,138,118,0.25)' }}>
          {errors.map((e, i) => (
            <div key={i} style={{ fontSize: 12.5, color: '#e6ab98', lineHeight: 1.6 }}>· {e}</div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 11, border: '1px solid rgba(231,238,246,0.12)', background: 'none', color: '#a6afba', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={handleSave} disabled={!canSave} style={{ flex: 2, padding: '12px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.2)', background: canSave ? 'linear-gradient(160deg, #eef2f6, #b7c3ce)' : 'rgba(231,238,246,0.05)', color: canSave ? '#14171c' : '#6a717b', fontSize: 14, fontWeight: 600, cursor: canSave ? 'pointer' : 'default' }}>
          {isEdit ? 'Guardar cambios' : duplicado ? `Sumar ${parseInt(form.cantidad) || 1} ud${(parseInt(form.cantidad) || 1) !== 1 ? 's.' : '.'}` : 'Agregar al stock'}
        </button>
      </div>
    </Modal>
  );
}

export default function Stock({ equipos, tc, onAdd, onUpdate, onDelete }) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('todas');
  const [cond, setCond] = useState('todas');
  const [estado, setEstado] = useState('todos');
  const [modal, setModal] = useState(null); // null | { mode:'add'|'edit', item?:{} }
  const [pendingDelete, setPendingDelete] = useState(null); // id del equipo a confirmar

  const q = search.trim().toLowerCase();

  const filtered = equipos.filter(e => {
    if (cat !== 'todas' && e.categoria !== cat) return false;
    if (cond !== 'todas' && e.cond !== cond) return false;
    if (estado !== 'todos' && e.estado !== estado) return false;
    if (q) {
      const hay = [e.modelo, e.cap, e.color, e.imei, e.categoria].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const disponibles = equipos.filter(e => e.estado === 'disponible');
  const valorDisp = disponibles.filter(e => esPhone(e.categoria)).reduce((a, b) => a + b.usd, 0);
  const estCount = (k) => k === 'todos' ? equipos.length : equipos.filter(e => e.estado === k).length;

  const pill = (active) => ({
    padding: '8px 13px', borderRadius: 30, fontSize: 12.5, fontWeight: active ? 600 : 500,
    background: active ? 'rgba(116,168,214,0.16)' : 'rgba(231,238,246,0.03)',
    border: `1px solid ${active ? 'rgba(116,168,214,0.5)' : 'rgba(231,238,246,0.08)'}`,
    color: active ? '#eef2f7' : '#828a94',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    cursor: 'pointer',
  });

  const handleSave = (data) => {
    if (modal.mode === 'add') {
      const dup = findDuplicateAccesorio(equipos, data);
      if (dup) {
        onUpdate(dup.id, { ...dup, cantidad: dup.cantidad + data.cantidad });
      } else {
        onAdd(data);
      }
    } else {
      onUpdate(modal.item.id, data);
    }
    setModal(null);
  };

  const catTabs = ['todas', ...CATEGORIAS.slice(0, 5)]; // first row: phones + watches

  return (
    <div>
      {modal && (
        <StockModal
          initial={modal.mode === 'edit' ? modal.item : null}
          equipos={equipos}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Inventario</div>
          <h1 style={{ margin: 0, fontSize: 33, fontWeight: 600, letterSpacing: -0.5 }}>
            Stock <span style={SERIF(33, '#9ec6ec')}>en piso</span>
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...MONO(10), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>Valor dispositivos</div>
            <div style={SERIF(28)}>{fUSD(valorDisp)}</div>
          </div>
          <button
            onClick={() => setModal({ mode: 'add' })}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.22)', background: 'linear-gradient(160deg, #eef2f6, #b7c3ce)', color: '#14171c', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <span style={{ fontSize: 17, lineHeight: 0, marginTop: -2 }}>+</span> Agregar producto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 15px', borderRadius: 11, background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.08)' }}>
          <div style={{ width: 13, height: 13, border: '1.5px solid #6a717b', borderRadius: '50%', position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', width: 5, height: 1.5, background: '#6a717b', transform: 'rotate(45deg)', bottom: -2, right: -3 }} />
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar por modelo, categoría, color o IMEI…" style={{ flex: 1, background: 'none', border: 'none', color: '#eef2f7', fontSize: 13.5 }} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a717b', fontSize: 16 }}>×</button>}
        </div>

        {/* Category + Cond + Estado filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Category pills */}
          {['todas','iPhone','iPad','Mac','AirPods','Apple Watch','Vidrio templado','Cargador','Cable','Funda/Case','Otro accesorio'].map(c => (
            <button key={c} onClick={() => setCat(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={pill(cat === c)}>{c === 'todas' ? 'Todos' : c}</span>
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: 'rgba(231,238,246,0.1)', margin: '0 4px' }} />
          {[['todas','Todas'],['Nuevo','Nuevos'],['Usado','Usados']].map(([k, l]) => (
            <button key={k} onClick={() => setCond(k)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={pill(cond === k)}>{l}</span>
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: 'rgba(231,238,246,0.1)', margin: '0 4px' }} />
          {[['todos','Todos'],['disponible','Disp.'],['reservado','Reserv.'],['vendido','Vend.']].map(([k, l]) => (
            <button key={k} onClick={() => setEstado(k)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={pill(estado === k)}>{l} <span style={{ ...MONO(10, estado === k ? '#93b8da' : '#6a717b') }}>{estCount(k)}</span></span>
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr 1.3fr 1.1fr 0.9fr 0.85fr 72px', gap: 12, padding: '0 14px 11px', borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
        {[['Producto','left'],['Categoría','left'],['Condición / Estado físico','left'],['IMEI / Stock','left'],['Precio','right'],['Estado','right'],['','right']].map(([h, align]) => (
          <span key={h} style={{ ...MONO(10, '#6a717b'), letterSpacing: 1.5, textTransform: 'uppercase', textAlign: align }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#6a717b', fontSize: 14 }}>Sin productos que coincidan con el filtro.</div>
        )}
        {filtered.map(e => {
          const isPhone = esPhone(e.categoria);
          const batC = e.bat ? batColor(e.bat) : null;
          const tieneDefectos = e.defectos && e.defectos.trim().length > 0;
          const isPending = pendingDelete === e.id;
          return (
            <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr 1.3fr 1.1fr 0.9fr 0.85fr 72px', gap: 12, alignItems: 'center', padding: '13px 14px', borderBottom: `1px solid ${tieneDefectos ? 'rgba(217,138,118,0.12)' : 'rgba(231,238,246,0.05)'}`, borderRadius: 10, background: tieneDefectos ? 'rgba(217,138,118,0.02)' : 'none' }}>
              {/* Producto */}
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7' }}>{e.modelo}</div>
                <div style={{ fontSize: 12, color: '#828a94', marginTop: 2 }}>
                  {[e.cap, e.color].filter(Boolean).join(' · ')}
                </div>
              </div>
              {/* Categoría */}
              <div style={{ fontSize: 12.5, color: '#a6afba' }}>{e.categoria}</div>
              {/* Condición + estado físico */}
              <div>
                {e.cond === 'Nuevo'
                  ? <span style={{ fontSize: 12, color: '#b6cdc1', padding: '3px 9px', borderRadius: 6, background: 'rgba(130,179,157,0.12)' }}>Nuevo · sellado</span>
                  : (
                    <div>
                      <span style={{ fontSize: 12, color: '#a6afba', padding: '3px 9px', borderRadius: 6, background: 'rgba(231,238,246,0.06)' }}>Usado</span>
                      {isPhone && e.bat && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
                          <div style={{ width: 28, height: 12, borderRadius: 3, border: `1.5px solid ${batC}`, position: 'relative', flexShrink: 0 }}>
                            <div style={{ position: 'absolute', inset: '1.5px 1.5px 1.5px', borderRadius: 1.5, background: batC, width: `${e.bat}%`, maxWidth: '100%' }} />
                            <div style={{ position: 'absolute', right: -3.5, top: '50%', transform: 'translateY(-50%)', width: 2.5, height: 5.5, borderRadius: '0 1px 1px 0', background: batC }} />
                          </div>
                          <span style={{ fontSize: 12, color: batC, fontWeight: 500 }}>{e.bat}%</span>
                        </div>
                      )}
                      {tieneDefectos && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: 5 }}>
                          <span style={{ fontSize: 11, color: '#d98a76', marginTop: 1, flexShrink: 0 }}>⚠</span>
                          <span style={{ fontSize: 11, color: '#c09080', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{e.defectos}</span>
                        </div>
                      )}
                    </div>
                  )
                }
              </div>
              {/* IMEI / Stock */}
              <div>
                {isPhone
                  ? <span style={{ ...MONO(11.5), letterSpacing: 0.3 }}>{e.imei || '—'}</span>
                  : <span style={{ fontSize: 13, color: '#a6afba' }}>{e.cantidad} ud{e.cantidad !== 1 ? 's.' : '.'}</span>
                }
              </div>
              {/* Precio */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7', whiteSpace: 'nowrap' }}>{fUSD(e.usd)}</div>
                {isPhone && <div style={{ fontSize: 11, color: '#828a94', marginTop: 1, whiteSpace: 'nowrap' }}>{fARS(e.usd * tc)}</div>}
                {e.costo > 0 && (() => {
                  const g = e.usd - e.costo;
                  const pct = Math.round((g / e.costo) * 100);
                  return (
                    <>
                      <div style={{ fontSize: 10.5, color: '#6a717b', marginTop: 3, whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>Cto. {fUSD(e.costo)}</div>
                      <div style={{ fontSize: 10.5, color: g >= 0 ? '#82b39d' : '#d98a76', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>{g >= 0 ? '+' : ''}{fUSD(g)} · {pct}%</div>
                    </>
                  );
                })()}
              </div>
              {/* Estado */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {e.estado === 'disponible' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#b6cdc1' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#82b39d', display: 'inline-block' }} />Disponible</span>}
                {e.estado === 'reservado'  && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#74a8d6' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#74a8d6', display: 'inline-block' }} />Reservado</span>}
                {e.estado === 'vendido'    && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6a717b' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6a717b', display: 'inline-block' }} />Vendido</span>}
              </div>
              {/* Acciones: Editar + Eliminar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                {isPending ? (
                  <>
                    <button onClick={() => { onDelete(e.id); setPendingDelete(null); }} title="Confirmar eliminación"
                      style={{ background: 'rgba(217,100,80,0.18)', border: '1px solid rgba(217,100,80,0.4)', cursor: 'pointer', color: '#e07060', fontSize: 11, fontWeight: 700, padding: '3px 7px', borderRadius: 6 }}>Sí</button>
                    <button onClick={() => setPendingDelete(null)} title="Cancelar"
                      style={{ background: 'none', border: '1px solid rgba(231,238,246,0.12)', cursor: 'pointer', color: '#6a717b', fontSize: 11, fontWeight: 600, padding: '3px 7px', borderRadius: 6 }}>No</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setModal({ mode: 'edit', item: e })} title="Editar"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a717b', fontSize: 15, padding: 4, borderRadius: 6 }}>✏</button>
                    <button onClick={() => setPendingDelete(e.id)} title="Eliminar"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a717b', fontSize: 14, padding: 4, borderRadius: 6 }}>✕</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
