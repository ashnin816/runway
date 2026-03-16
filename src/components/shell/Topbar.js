'use client';
import { useAuth } from '@/context/AuthContext';
import { useUI } from '@/context/UIContext';
import { useModel } from '@/context/ModelContext';
import { exportExcel } from '@/lib/exportExcel';
import { useGating } from '@/hooks/useGating';
import { startCheckout } from '@/lib/stripe';

const iconBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--muted)',
  padding: '6px',
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  transition: 'color .15s, background .15s, transform .15s',
};

function IconBtn({ title, onClick, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={iconBtnStyle}
      onMouseEnter={e => {
        e.currentTarget.style.color = 'var(--text)';
        e.currentTarget.style.background = 'var(--surface2)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = 'var(--muted)';
        e.currentTarget.style.background = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {children}
    </button>
  );
}

/* 16x16 stroke-based SVG icons */
const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const PeopleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const panelNames = {
  overview: 'Overview',
  model: 'Model',
  actuals: 'Actuals',
  'team-access': 'Team Access',
};

export default function Topbar() {
  const { user, signOut } = useAuth();
  const { darkMode, toggleDarkMode, activePanel, setActivePanel } = useUI();
  const { state, saveStatus } = useModel();
  const { isTrial, trialDaysLeft, trialExpired, canExport, requireUpgrade } = useGating();

  return (
    <div className="topbar">
      <div className="topbar-title">Runway <em>&middot; {panelNames[activePanel] || 'Model'}</em></div>

      {/* Trial banner */}
      {isTrial && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '4px 12px', borderRadius: 6,
          fontSize: 12, fontWeight: 600,
          fontFamily: "'Outfit', sans-serif",
          background: trialDaysLeft <= 3 ? 'rgba(239,68,68,.1)' : 'rgba(245,158,11,.1)',
          color: trialDaysLeft <= 3 ? '#ef4444' : '#d97706',
          border: `1px solid ${trialDaysLeft <= 3 ? 'rgba(239,68,68,.2)' : 'rgba(245,158,11,.2)'}`,
        }}>
          <span>Trial: {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left</span>
          <button
            onClick={() => startCheckout(user?.id, user?.email)}
            style={{
              padding: '2px 10px', borderRadius: 4, border: 'none',
              background: trialDaysLeft <= 3 ? '#ef4444' : '#d97706',
              color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Upgrade
          </button>
        </div>
      )}
      {trialExpired && (
        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'Outfit', sans-serif" }}>Free plan</span>
      )}

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Dark mode toggle */}
        <IconBtn
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggleDarkMode}
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
        </IconBtn>

        {/* Excel export */}
        <IconBtn
          title="Export to Excel"
          onClick={() => canExport ? exportExcel(state) : requireUpgrade('export')}
        >
          <DownloadIcon />
        </IconBtn>

        {/* Team Access */}
        <IconBtn
          title="Team Access"
          onClick={() => setActivePanel('team-access')}
        >
          <PeopleIcon />
        </IconBtn>

        {/* User bar */}
        {user && (
          <div className="auth-user-bar" style={{ display: 'flex', marginLeft: 8 }}>
            <span className="dot"></span>
            <span>{user.email}</span>
            <button onClick={() => signOut()}>sign out</button>
          </div>
        )}

        {/* Save toast */}
        {saveStatus === 'saving' && (
          <span className="save-toast show" style={{ color: 'var(--muted)' }}>Saving...</span>
        )}
        {saveStatus === 'saved' && (
          <span className="save-toast show" style={{ color: 'var(--green, #22c55e)' }}>&#10003; Saved</span>
        )}
        {saveStatus === 'error' && (
          <span className="save-toast show" style={{ color: 'var(--red, #ef4444)' }}>Save failed</span>
        )}
      </div>
    </div>
  );
}
