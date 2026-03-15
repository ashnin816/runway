'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [activePanel, setActivePanel] = useState('overview');
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [modelTab, setModelTab] = useState('team');

  useEffect(() => {
    try {
      if (localStorage.getItem('runway_dark') === '1') {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
      }
      if (localStorage.getItem('runway_sidebar') === '1') {
        setSidebarCollapsed(true);
      }
    } catch {}
  }, []);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('runway_dark', next ? '1' : '0'); } catch {}
  }

  function toggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try { localStorage.setItem('runway_sidebar', next ? '1' : '0'); } catch {}
  }

  const value = {
    activePanel, setActivePanel,
    darkMode, toggleDarkMode,
    sidebarCollapsed, toggleSidebar,
    chatOpen, setChatOpen,
    modelTab, setModelTab,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
