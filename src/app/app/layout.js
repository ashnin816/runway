'use client';
import { ModelProvider } from '@/context/ModelContext';
import { AuthProvider } from '@/context/AuthContext';
import { UIProvider } from '@/context/UIContext';
import Sidebar from '@/components/shell/Sidebar';
import Topbar from '@/components/shell/Topbar';

export default function AppLayout({ children }) {
  return (
    <AuthProvider>
      <UIProvider>
        <ModelProvider>
          <div className="app-shell" style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-area">
              <Topbar />
              <div className="main-content">
                <div className="page">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </ModelProvider>
      </UIProvider>
    </AuthProvider>
  );
}
