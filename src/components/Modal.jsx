import { useRef } from 'react';

export default function Modal({ title, onClose, children, width = 560 }) {
  const mouseDownOnBackdrop = useRef(false);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onMouseUp={e => { if (mouseDownOnBackdrop.current && e.target === e.currentTarget) onClose(); mouseDownOnBackdrop.current = false; }}
    >
      <div
        style={{
          width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto',
          background: '#181b20', borderRadius: 20,
          border: '1px solid rgba(231,238,246,0.1)',
          boxShadow: '0 32px 80px -16px rgba(0,0,0,0.8)',
        }}
      >
        <div className="modal-head">
          <span style={{ fontSize: 18, fontWeight: 600, color: '#eef2f7' }}>{title}</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a717b', fontSize: 20, lineHeight: 1, padding: 4 }}
          >×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
