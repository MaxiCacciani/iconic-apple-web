import { batColor } from '../lib/utils.js';

export default function BatBadge({ bat }) {
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
