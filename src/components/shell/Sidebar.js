'use client';
import { useUI } from '@/context/UIContext';

const navItems = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
  {
    id: 'model',
    label: 'Model',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: 'actuals',
    label: 'Actuals',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const { activePanel, setActivePanel, sidebarCollapsed, toggleSidebar } = useUI();

  return (
    <div className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}`} style={{ position: 'relative' }}>
      <div className="sb-logo">
        <h1>Runway<span>.fyi</span></h1>
        <p>Financial Modeling &middot; Startups</p>
      </div>

      <nav className="sb-nav">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`sb-item${activePanel === item.id ? ' active' : ''}`}
            data-panel={item.id}
            data-tip={item.label}
            onClick={() => setActivePanel(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <button className="sb-collapse-btn" onClick={toggleSidebar} title="Toggle sidebar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>Collapse</span>
      </button>
    </div>
  );
}
