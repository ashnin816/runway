'use client';
import { useEffect, useRef } from 'react';
import { useUI } from '@/context/UIContext';
import { useAuth } from '@/context/AuthContext';
import { startCheckout } from '@/lib/stripe';

const featureMessages = {
  employees: "You've reached the free limit of 3 team members. Upgrade to add unlimited employees and contractors.",
  export: "Excel export is a Pro feature. Upgrade to export your full financial model.",
  sharing: "Team sharing is a Pro feature. Upgrade to invite collaborators.",
  actuals: "Editing actuals is a Pro feature. Upgrade to track your actual expenses and revenue.",
};

export default function UpgradeModal() {
  const { upgradeModalFeature, setUpgradeModalFeature } = useUI();
  const { user } = useAuth();
  const upgradeRef = useRef(null);

  const open = upgradeModalFeature != null;

  useEffect(() => {
    if (open) {
      upgradeRef.current?.focus();
      const handler = (e) => { if (e.key === 'Escape') setUpgradeModalFeature(null); };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }
  }, [open, setUpgradeModalFeature]);

  if (!open) return null;

  const message = featureMessages[upgradeModalFeature] || 'Upgrade to Pro to unlock this feature.';
  const colors = { bg: '#3b82f6', hover: '#2563eb', accent: 'rgba(59,130,246,.08)', border: 'rgba(59,130,246,.2)', icon: '#3b82f6' };

  return (
    <div
      onClick={() => setUpgradeModalFeature(null)}
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
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>

        {/* Title */}
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 17, fontWeight: 600,
          color: 'var(--text)',
          marginBottom: 6,
        }}>
          Upgrade to Pro
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
            onClick={() => setUpgradeModalFeature(null)}
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
            Maybe later
          </button>
          <button
            ref={upgradeRef}
            onClick={() => startCheckout(user?.id, user?.email)}
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
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  );
}
