import Modal from './Modal.jsx';
import { esPhone } from '../data/data.js';
import { fARS, fUSD } from '../lib/utils.js';
import { abrirGarantiaEnVentana } from '../lib/db.js';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderRadius: 9, background: 'rgba(231,238,246,0.02)', border: '1px solid rgba(231,238,246,0.06)' }}>
      <span style={{ fontSize: 13, color: '#828a94' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#eef2f7', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function VentaDetalleModal({ venta, onClose }) {
  const lineas = venta.lineas && venta.lineas.length > 0 ? venta.lineas : null;
  const tcV = venta.tc || 1400;

  const rows = lineas || [{
    equipo:   venta.equipo || '',
    imei:     venta.imei || '',
    categoria: venta.categoria || '',
    usd:      venta.usd,
  }];

  const totalUSD = rows.reduce((a, b) => a + (b.usd || 0) * (b.cantidad || 1), 0);

  return (
    <Modal title="Detalle de venta" onClose={onClose} width={540}>
      {/* Encabezado: cliente + fecha */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#eef2f7' }}>{venta.cliente || '—'}</div>
          <div style={{ ...MONO(11.5), marginTop: 4 }}>{venta.fechaLabel || venta.fecha || ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={SERIF(28, '#eef2f7')}>{fUSD(totalUSD)}</div>
          <div style={{ ...MONO(11.5), marginTop: 3 }}>{fARS(totalUSD * tcV)}</div>
        </div>
      </div>

      {/* Productos */}
      <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, color: '#6a717b' }}>
        {rows.length === 1 ? 'Producto' : `Productos · ${rows.length} ítems`}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {rows.map((l, i) => {
          const phone = esPhone(l.categoria);
          const parts = (l.equipo || '').split(' · ');
          const nombre = parts[0] || l.equipo || '—';
          const spec   = parts.slice(1).join(' · ');
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(231,238,246,0.08)', background: 'rgba(231,238,246,0.02)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7' }}>{nombre}</div>
                {spec && <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 2 }}>{spec}</div>}
                {phone && l.imei && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7 }}>
                    <span style={{ ...MONO(10, '#6a717b'), letterSpacing: 1, textTransform: 'uppercase' }}>IMEI</span>
                    <span style={{ ...MONO(12, '#a6afba'), letterSpacing: 0.2 }}>{l.imei}</span>
                  </div>
                )}
                {l.garantiaUrl && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {l.garantiaUrl.split('|').filter(Boolean).map((url, j) => {
                      const gNombre = l.garantiaNombre ? (l.garantiaNombre.split('|')[j] || `Garantía ${j + 1}`) : `Garantía ${j + 1}`;
                      return (
                        <a key={j} href={url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, background: 'rgba(130,179,157,0.08)', border: '1px solid rgba(130,179,157,0.25)', color: '#82b39d', fontSize: 12, textDecoration: 'none' }}>
                          ↗ {gNombre}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 14.5, fontWeight: 600, color: l.esRegalo ? '#82b39d' : '#eef2f7', whiteSpace: 'nowrap' }}>
                  {l.esRegalo ? '🎁 Regalo' : fUSD(l.usd || 0)}
                </span>
                {l.cantidad > 1 && !l.esRegalo && <span style={{ fontSize: 11.5, color: '#828a94' }}>x{l.cantidad} uds.</span>}
              </div>
            </div>
          );
        })}
        {rows.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px 0' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#eef2f7' }}>Total {fUSD(totalUSD)}</span>
          </div>
        )}
      </div>

      {/* Condiciones de pago */}
      <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, color: '#6a717b' }}>Condiciones de pago</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <Row label="Método" value={venta.metodo || '—'} />
        {venta.modalidad === 'cuotas' && (
          <Row label="Cuotas" value={`${venta.cuotas} x ${fUSD(venta.cuotaMonto || 0)}`} />
        )}
        {venta.modalidad === 'cuotas' && venta.anticipo > 0 && (
          <Row label="Anticipo" value={fUSD(venta.anticipo)} />
        )}
        {venta.modalidad === 'apartado' && venta.anticipo > 0 && (
          <Row label="Seña" value={fARS(venta.anticipo)} />
        )}
        {venta.modalidad === 'contado' && (
          <Row label="Modalidad" value="Contado · pago único" />
        )}
        {venta.canje && venta.canjeEquipo && (
          <Row
            label="Canje"
            value={`${venta.canjeEquipo}${venta.canjeValor ? ' · ' + fUSD(venta.canjeValor) : ''}`}
          />
        )}
        {lineas
          ? lineas.filter(l => esPhone(l.categoria)).map((l, i) => (
              <Row key={i} label={`Garantía · ${l.equipo}`}
                value={l.sinGarantia || !l.garantiaVence ? 'Sin garantía' : `Hasta ${l.garantiaVence.split('-').reverse().join('/')}`} />
            ))
          : (venta.sinGarantia || venta.garantiaVence) && (
            <Row label="Garantía" value={venta.sinGarantia ? 'Sin garantía' : `Hasta ${venta.garantiaVence.split('-').reverse().join('/')}`} />
          )}
        <Row label="TC del día" value={`$${(tcV).toLocaleString('es-AR')}`} />
      </div>

      {/* Garantía */}
      {venta.garantiaUrl && (
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(231,238,246,0.08)' }}>
          <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, color: '#6a717b' }}>Garantía adjunta</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {venta.garantiaUrl.split('|').filter(Boolean).map((path, i) => {
              const nombre = venta.garantiaNombre ? (venta.garantiaNombre.split('|')[i] || `Garantía ${i + 1}`) : `Garantía ${i + 1}`;
              return (
                <button key={i}
                  onClick={() => { const w = window.open('about:blank', '_blank'); abrirGarantiaEnVentana(w, path).catch(() => {}); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, background: 'rgba(130,179,157,0.08)', border: '1px solid rgba(130,179,157,0.3)', color: '#82b39d', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  ↗ {nombre}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
