export default function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
      zIndex: 60, display: 'flex', alignItems: 'center', gap: 13,
      padding: '15px 22px', borderRadius: 14,
      background: '#1e2228', border: '1px solid rgba(130,179,157,0.4)',
      boxShadow: '0 20px 50px -16px rgba(0,0,0,0.7)',
      animation: 'toastIn 0.4s cubic-bezier(0.2,0.9,0.3,1) both',
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%', background: '#82b39d',
        color: '#14171c', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 13,
      }}>✓</span>
      <span style={{ fontSize: 14, color: '#eef2f7' }}>{msg}</span>
    </div>
  );
}
