import { useRef } from 'react';

export default function Modal({ title, onClose, children, width = 560 }) {
  const mouseDownOnBackdrop = useRef(false);

  return (
    <div
      onMouseDown={e => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onMouseUp={e => { if (mouseDownOnBackdrop.current && e.target === e.currentTarget) onClose(); mouseDownOnBackdrop.current = false; }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(10,12,15,0.78)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto',
          background: '#181b20', borderRadius: 20,
          border: '1px solid rgba(231,238,246,0.1)',
          boxShadow: '0 32px 80px -16px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px 0' }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#eef2f7' }}>{title}</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a717b', fontSize: 20, lineHeight: 1, padding: 4 }}
          >×</button>
        </div>
        <div style={{ padding: '20px 28px 28px' }}>{children}</div>
      </div>
    </div>
  );
}
