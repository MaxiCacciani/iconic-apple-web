import { useState } from 'react';
import { COBROS, CLIENTES, TODAY, MONTH_NAMES, DAY_NAMES, fARS, dnum, dim, firstW, weekdayOf } from '../data/data.js';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });

function buildGarEvents() {
  const events = [];
  CLIENTES.forEach(c => c.compras.forEach(co => {
    events.push({ y: co.gVence.y, m: co.gVence.m, d: co.gVence.d, cliente: c.nombre, equipo: co.modelo + ' · ' + co.cap, vencida: dnum(co.gVence) < dnum(TODAY) });
  }));
  return events;
}
const GAR_EVENTS = buildGarEvents();

export default function Cobros() {
  const [calY, setCalY] = useState(TODAY.y);
  const [calM, setCalM] = useState(TODAY.m);
  const [selY, setSelY] = useState(TODAY.y);
  const [selM, setSelM] = useState(TODAY.m);
  const [selD, setSelD] = useState(TODAY.d);

  const prevMonth = () => {
    if (calM === 1) { setCalY(calY - 1); setCalM(12); setSelY(calY - 1); setSelM(12); setSelD(1); }
    else { setCalM(calM - 1); setSelM(calM - 1); setSelD(1); }
  };
  const nextMonth = () => {
    if (calM === 12) { setCalY(calY + 1); setCalM(1); setSelY(calY + 1); setSelM(1); setSelD(1); }
    else { setCalM(calM + 1); setSelM(calM + 1); setSelD(1); }
  };
  const selDay = (d) => { setSelD(d); setSelY(calY); setSelM(calM); };

  const cobMonth = COBROS.filter(c => c.y === calY && c.m === calM);
  const garMonth = GAR_EVENTS.filter(g => g.y === calY && g.m === calM);
  const mSum = (st) => cobMonth.filter(c => c.estado === st).reduce((a, b) => a + b.monto, 0);

  const di = dim(calY, calM);
  const fw = firstW(calY, calM);
  const cells = [];
  for (let i = 0; i < fw; i++) cells.push({ empty: true });
  for (let d = 1; d <= di; d++) {
    const cob = cobMonth.filter(c => c.d === d);
    const isToday = calY === TODAY.y && calM === TODAY.m && d === TODAY.d;
    cells.push({
      empty: false, num: d, isToday,
      selected: selY === calY && selM === calM && selD === d,
      tieneGar: garMonth.some(g => g.d === d),
      marks: cob.map(c => ({ esP: c.estado === 'pendiente', esV: c.estado === 'vencida', esC: c.estado === 'cobrada' })),
      onClick: () => selDay(d),
    });
  }
  while (cells.length % 7 !== 0) cells.push({ empty: true });
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const selCob = COBROS.filter(c => c.y === selY && c.m === selM && c.d === selD);
  const selGar = GAR_EVENTS.filter(g => g.y === selY && g.m === selM && g.d === selD);
  const dayEmpty = selCob.length + selGar.length === 0;
  const dayName = DAY_NAMES[weekdayOf(selY, selM, selD)];
  const monthNameLow = MONTH_NAMES[selM - 1].toLowerCase();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 26, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ ...MONO(11), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Agenda</div>
          <h1 style={{ margin: 0, fontSize: 33, fontWeight: 600, letterSpacing: -0.5 }}>
            Cobros y <span style={SERIF(33, '#9b93d6')}>garantías</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[['Por cobrar', fARS(mSum('pendiente')), '#74a8d6'],['Vencido', fARS(mSum('vencida')), '#d98a76'],['Garantías', `${garMonth.length}`, '#9b93d6']].map(([label, val, color]) => (
            <div key={label}>
              <div style={{ ...MONO(10), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: 19, fontWeight: 600, color, whiteSpace: 'nowrap' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.75fr) minmax(0,1fr)', gap: 22, alignItems: 'start' }}>
        {/* Calendar */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={SERIF(26)}>{MONTH_NAMES[calM - 1]} {calY}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['‹', prevMonth],['›', nextMonth]].map(([icon, fn]) => (
                <button key={icon} onClick={fn} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(231,238,246,0.1)', background: 'rgba(231,238,246,0.03)', color: '#a6afba', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 9 }}>
            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
              <span key={d} style={{ ...MONO(10, '#6a717b'), letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center', paddingBottom: 4 }}>{d}</span>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {week.map((cell, ci) => (
                  cell.empty
                    ? <div key={ci} />
                    : (
                      <button key={ci} onClick={cell.onClick} style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 80, padding: '9px 10px', borderRadius: 12, border: cell.selected ? '1.5px solid #74a8d6' : '1px solid rgba(231,238,246,0.06)', background: cell.selected ? 'rgba(116,168,214,0.08)' : 'rgba(231,238,246,0.015)', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          {cell.isToday
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: '#74a8d6', color: '#14171c', fontSize: 12.5, fontWeight: 700 }}>{cell.num}</span>
                            : <span style={{ fontSize: 13.5, fontWeight: 500, color: '#a6afba' }}>{cell.num}</span>
                          }
                          {cell.tieneGar && <span style={{ width: 9, height: 9, borderRadius: '50%', border: '2px solid #9b93d6', display: 'inline-block' }} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {cell.marks.slice(0,3).map((m, mi) => (
                            <span key={mi} style={{ width: '100%', height: 5, borderRadius: 4, display: 'block', background: m.esP ? '#74a8d6' : m.esV ? '#d98a76' : '#82b39d' }} />
                          ))}
                        </div>
                      </button>
                    )
                ))}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 18, marginTop: 18, flexWrap: 'wrap' }}>
            {[['#74a8d6','Pendiente'],['#d98a76','Vencida'],['#82b39d','Cobrada']].map(([color, label]) => (
              <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#828a94' }}>
                <span style={{ width: 16, height: 5, borderRadius: 4, background: color, display: 'inline-block' }} />{label}
              </span>
            ))}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#828a94' }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid #9b93d6', display: 'inline-block' }} />Garantía vence
            </span>
          </div>
        </div>

        {/* Day panel */}
        <div style={{ position: 'sticky', top: 96, padding: 26, borderRadius: 20, border: '1px solid rgba(231,238,246,0.08)', background: '#181b20' }}>
          <div style={{ ...MONO(10), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Día seleccionado</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 22 }}>
            <span style={SERIF(30)}>{dayName} {selD}</span>
            <span style={{ fontSize: 14, color: '#828a94' }}>de {monthNameLow}</span>
          </div>

          {selCob.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
                <span style={{ ...MONO(10, '#74a8d6'), letterSpacing: 1.5, textTransform: 'uppercase' }}>Cobros</span>
                <span style={{ fontSize: 13, color: '#a6afba' }}>{fARS(selCob.reduce((a, b) => a + b.monto, 0))}</span>
              </div>
              {selCob.map((d, i) => (
                <div key={i} style={{ padding: '13px 0', borderBottom: '1px solid rgba(231,238,246,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7', whiteSpace: 'nowrap' }}>{d.cliente}</span>
                    <span style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{fARS(d.monto)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 12, color: '#828a94', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.equipo}</span>
                    {d.estado === 'pendiente' && <span style={{ fontSize: 11, color: '#74a8d6', padding: '2px 9px', borderRadius: 20, background: 'rgba(116,168,214,0.13)' }}>Pendiente</span>}
                    {d.estado === 'vencida'   && <span style={{ fontSize: 11, color: '#d98a76', padding: '2px 9px', borderRadius: 20, background: 'rgba(217,138,118,0.13)' }}>Vencida</span>}
                    {d.estado === 'cobrada'   && <span style={{ fontSize: 11, color: '#82b39d', padding: '2px 9px', borderRadius: 20, background: 'rgba(130,179,157,0.13)' }}>Cobrada</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selGar.length > 0 && (
            <div>
              <div style={{ paddingBottom: 10, borderBottom: '1px solid rgba(231,238,246,0.08)' }}>
                <span style={{ ...MONO(10, '#9b93d6'), letterSpacing: 1.5, textTransform: 'uppercase' }}>Garantías</span>
              </div>
              {selGar.map((g, i) => (
                <div key={i} style={{ padding: '13px 0', borderBottom: '1px solid rgba(231,238,246,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7', whiteSpace: 'nowrap' }}>{g.cliente}</span>
                    {!g.vencida && <span style={{ fontSize: 11, color: '#9b93d6', padding: '2px 9px', borderRadius: 20, background: 'rgba(155,147,214,0.14)' }}>Vence</span>}
                    {g.vencida  && <span style={{ fontSize: 11, color: '#d98a76', padding: '2px 9px', borderRadius: 20, background: 'rgba(217,138,118,0.13)' }}>Vencida</span>}
                  </div>
                  <span style={{ fontSize: 12, color: '#828a94' }}>{g.equipo}</span>
                </div>
              ))}
            </div>
          )}

          {dayEmpty && (
            <div style={{ padding: '28px 0', textAlign: 'center', color: '#6a717b', fontSize: 13.5 }}>Nada agendado este día.</div>
          )}
        </div>
      </div>
    </div>
  );
}
