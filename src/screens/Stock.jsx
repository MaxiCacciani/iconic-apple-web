import { useState } from 'react';
import { CATEGORIAS, CATEGORIAS_PHONE, esPhone, fARS, fUSD, batColor } from '../data/data.js';
import Modal from '../components/Modal.jsx';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });
const TC = 1400;

const EMPTY_FORM = {
  categoria: 'iPhone', modelo: '', cap: '', color: '',
  cond: 'Nuevo', bat: '', imei: '', usd: '', estado: 'disponible', cantidad: 1,
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
      placeholder={placeholder}
      style={{
        width: '100%', padding: '11px 14px', borderRadius: 10,
        background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)',
        color: '#eef2f7', fontSize: 14, ...style,
      }}
    />
  );
}

function FieldSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: '100%', padding: '11px 14px', borderRadius: 10,
        background: '#1e2228', border: '1px solid rgba(231,238,246,0.09)',
        color: '#eef2f7', fontSize: 14, appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236a717b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
      }}
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function StockModal({ initial, onSave, onClose }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial ? { ...initial, bat: initial.bat ?? '', usd: initial.usd ?? '' } : { ...EMPTY_FORM });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const phone = esPhone(form.categoria);

  const handleSave = () => {
    if (!form.modelo.trim() || !form.usd) return;
    onSave({
      ...form,
      usd: parseFloat(form.usd) || 0,
      bat: phone && form.cond === 'Usado' ? (parseInt(form.bat) || null) : null,
      imei: phone ? form.imei : '',
      cantidad: phone ? 1 : (parseInt(form.cantidad) || 1),
    });
  };

  const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 };
  const fieldWrap = { marginBottom: 16 };

  return (
    <Modal title={isEdit ? 'Editar producto' : 'Agregar producto'} onClose={onClose} width={580}>
      <div style={fieldWrap}>
        <FieldLabel>Categoría</FieldLabel>
        <FieldSelect value={form.categoria} onChange={e => set('categoria', e.target.value)}
          options={CATEGORIAS.map(c => [c, c])} />
      </div>

      <div style={fieldWrap}>
        <FieldLabel>Modelo / Descripción</FieldLabel>
        <FieldInput value={form.modelo} onChange={e => set('modelo', e.target.value)} placeholder="ej. iPhone 16 Pro Max" />
      </div>

      <div style={{ ...row2, ...fieldWrap }}>
        <div>
          <FieldLabel>{phone ? 'Almacenamiento' : 'Especificación'}</FieldLabel>
          <FieldInput value={form.cap} onChange={e => set('cap', e.target.value)} placeholder={phone ? '256 GB' : '20W, 1m…'} />
        </div>
        <div>
          <FieldLabel>Color</FieldLabel>
          <FieldInput value={form.color} onChange={e => set('color', e.target.value)} placeholder="Titanio Natural…" />
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

      <div style={{ ...row2, ...fieldWrap }}>
        <div>
          <FieldLabel>Precio (USD)</FieldLabel>
          <FieldInput type="number" value={form.usd} onChange={e => set('usd', e.target.value)} placeholder="950" />
        </div>
        <div>
          <FieldLabel>Estado</FieldLabel>
          <FieldSelect value={form.estado} onChange={e => set('estado', e.target.value)}
            options={[['disponible','Disponible'],['reservado','Reservado'],['vendido','Vendido']]} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 11, border: '1px solid rgba(231,238,246,0.12)', background: 'none', color: '#a6afba', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={handleSave} style={{ flex: 2, padding: '12px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.2)', background: 'linear-gradient(160deg, #eef2f6, #b7c3ce)', color: '#14171c', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {isEdit ? 'Guardar cambios' : 'Agregar al stock'}
        </button>
      </div>
    </Modal>
  );
}

export default function Stock({ equipos, onAdd, onUpdate }) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('todas');
  const [cond, setCond] = useState('todas');
  const [estado, setEstado] = useState('todos');
  const [modal, setModal] = useState(null); // null | { mode:'add'|'edit', item?:{} }

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
      onAdd(data);
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
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr 0.8fr 1.1fr 0.9fr 0.85fr 36px', gap: 12, padding: '0 14px 11px', borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
        {[['Producto','left'],['Categoría','left'],['Condición','left'],['IMEI / Stock','left'],['Precio','right'],['Estado','right'],['','right']].map(([h, align]) => (
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
          return (
            <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr 0.8fr 1.1fr 0.9fr 0.85fr 36px', gap: 12, alignItems: 'center', padding: '13px 14px', borderBottom: '1px solid rgba(231,238,246,0.05)', borderRadius: 10 }}>
              {/* Producto */}
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7' }}>{e.modelo}</div>
                <div style={{ fontSize: 12, color: '#828a94', marginTop: 2 }}>
                  {[e.cap, e.color, isPhone && e.cond === 'Usado' && e.bat ? `${e.bat}% bat.` : null].filter(Boolean).join(' · ')}
                </div>
              </div>
              {/* Categoría */}
              <div style={{ fontSize: 12.5, color: '#a6afba' }}>{e.categoria}</div>
              {/* Condición */}
              <div>
                {e.cond === 'Nuevo'
                  ? <span style={{ fontSize: 12, color: '#b6cdc1', padding: '3px 9px', borderRadius: 6, background: 'rgba(130,179,157,0.12)' }}>Nuevo</span>
                  : <span style={{ fontSize: 12, color: '#a6afba', padding: '3px 9px', borderRadius: 6, background: 'rgba(231,238,246,0.06)' }}>Usado</span>
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
                {isPhone && <div style={{ fontSize: 11, color: '#828a94', marginTop: 1, whiteSpace: 'nowrap' }}>{fARS(e.usd * TC)}</div>}
              </div>
              {/* Estado */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {e.estado === 'disponible' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#b6cdc1' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#82b39d', display: 'inline-block' }} />Disponible</span>}
                {e.estado === 'reservado'  && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#74a8d6' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#74a8d6', display: 'inline-block' }} />Reservado</span>}
                {e.estado === 'vendido'    && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6a717b' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6a717b', display: 'inline-block' }} />Vendido</span>}
              </div>
              {/* Editar */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => setModal({ mode: 'edit', item: e })}
                  title="Editar"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a717b', fontSize: 15, padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >✏</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
