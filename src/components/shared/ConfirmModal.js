'use client';
import { useEffect, useRef } from 'react';

export default function ConfirmModal({ open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', variant = 'danger', onConfirm, onCancel }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open) {
      confirmRef.current?.focus();
      const handler = (e) => { if (e.key === 'Escape') onCancel(); };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }
  }, [open, onCancel]);

  if (!open) return null;

  const colors = variant === 'danger'
    ? { bg: '#ef4444', hover: '#dc2626', accent: 'rgba(239,68,68,.08)', border: 'rgba(239,68,68,.2)', icon: '#ef4444' }
    : { bg: '#3b82f6', hover: '#2563eb', accent: 'rgba(59,130,246,.08)', border: 'rgba(59,130,246,.2)', icon: '#3b82f6' };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 20000,
        background: 'rgba(0,0,0,.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeUp .15s ease',
      }}
    >
      <div
        className="modal-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '28px 32px',
          maxWidth: 400,
          width: '90%',
          boxShadow: '0 12px 48px rgba(0,0,0,.2)',
          animation: 'fadeUp .2s ease',
        }}
      >
        {/* Icon */}
        <div className="modal-icon-pop" style={{
          width: 44, height: 44, borderRadius: '50%',
          background: colors.accent,
          border: `1px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </div>

        {/* Title */}
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 17, fontWeight: 600,
          color: 'var(--text)',
          marginBottom: 6,
        }}>
          {title}
        </div>

        {/* Message */}
        <div style={{
          fontSize: 13, color: 'var(--muted)',
          lineHeight: 1.6, marginBottom: 24,
        }}>
          {message}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 20px', borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            style={{
              padding: '9px 20px', borderRadius: 8,
              border: 'none',
              background: colors.bg,
              color: '#fff',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
