import { useState } from 'react';
import { CLIENTES, RESERVAS, TODAY, fARS, fUSD, dnum, mesesRest, gvFmt, saldoDe } from '../data/data.js';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });

export default function Clientes() {
  const [view, setView] = useState('list');
  const [clienteId, setClienteId] = useState('c1');
  const [search, setSearch] = useState('');

  const openCliente = (id) => { setClienteId(id); setView('detail'); };
  const goBack = () => setView('list');

  const q = search.trim().toLowerCase();
  const clienteRows = CLIENTES.filter(c => !q || (c.nombre + ' ' + c.dni).toLowerCase().includes(q));

  if (view === 'detail') {
    const cli = CLIENTES.find(c => c.id === clienteId) || CLIENTES[0];
    const enMora = !!(cli.plan && cli.plan.mora);
    const cliCompras = cli.compras.map(co => {
      const mr = mesesRest(co.gVence);
      const vig = dnum(co.gVence) >= dnum(TODAY);
      let gl;
      if (vig) gl = mr >= 1 ? `Garantía · ${mr} ${mr === 1 ? 'mes' : 'meses'}` : 'Garantía · menos de 1 mes';
      else gl = 'Garantía vencida · ' + gvFmt(co.gVence);
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
    const reservasCli = RESERVAS.filter(r => r.cliente === cli.nombre && r.estado === 'activa');

    return (
      <div>
        <button onClick={goBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#828a94', fontSize: 13.5, marginBottom: 18, padding: 0 }}>‹ Volver al directorio</button>

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
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>Saldo pendiente</div>
            <div style={SERIF(38, '#9ec6ec')}>{fARS(saldoDe(cli))}</div>
            <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 7 }}>Total comprado · {fUSD(cli.compras.reduce((a, b) => a + b.usd, 0))}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
          {/* Equipos comprados */}
          <div style={{ padding: '26px 28px', borderRadius: 20, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20' }}>
            <span style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase' }}>Equipos comprados · {cliCompras.length}</span>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cliCompras.length === 0 && <div style={{ paddingTop: 16, color: '#6a717b', fontSize: 13.5 }}>Todavía sin compras registradas.</div>}
              {cliCompras.map((co, i) => (
                <div key={i} style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid rgba(231,238,246,0.07)', background: 'rgba(231,238,246,0.015)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 15.5, fontWeight: 600, color: '#eef2f7' }}>{co.modelo}</div>
                      <div style={{ fontSize: 12.5, color: '#828a94', marginTop: 2 }}>{co.cap} · {co.color}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{fUSD(co.usd)}</div>
                      <div style={{ fontSize: 12, color: '#828a94', marginTop: 1, whiteSpace: 'nowrap' }}>{co.fecha}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 13, paddingTop: 13, borderTop: '1px solid rgba(231,238,246,0.06)', flexWrap: 'wrap' }}>
                    <span style={{ ...MONO(11.5) }}>{co.imei}</span>
                    <span style={{ fontSize: 12, color: '#a6afba' }}>{co.cond}{co.bat ? ` · batería ${co.bat}%` : ' · sellado'}</span>
                    <div style={{ flex: 1 }} />
                    {co.garVigente
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#82b39d' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#82b39d', display: 'inline-block' }} />{co.garLabel}</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#d98a76' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d98a76', display: 'inline-block' }} />{co.garLabel}</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right col: plan + reservas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '26px 28px', borderRadius: 20, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20' }}>
              <span style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase' }}>Plan de cuotas</span>
              {planView
                ? (
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
                )
                : <div style={{ marginTop: 14, paddingTop: 16, color: '#6a717b', fontSize: 13.5 }}>Sin financiación activa. Compras al contado.</div>
              }
            </div>

            <div style={{ padding: '26px 28px', borderRadius: 20, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20' }}>
              <span style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase' }}>Reservas</span>
              {reservasCli.length > 0
                ? (
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
                )
                : <div style={{ marginTop: 14, paddingTop: 16, color: '#6a717b', fontSize: 13.5 }}>Sin reservas activas.</div>
              }
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
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
          return (
            <button key={c.id} onClick={() => openCliente(c.id)} style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 1.3fr 0.7fr 1fr 0.9fr', gap: 16, alignItems: 'center', padding: '14px 20px', border: 'none', borderBottom: '1px solid rgba(231,238,246,0.05)', borderRadius: 12, background: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(116,168,214,0.13)', color: '#9ec6ec', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{c.inicial}</span>
                <span style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7' }}>{c.nombre}</span>
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
