'use client';
import { useEffect } from 'react';
import { useUI } from '@/context/UIContext';
import { useAuth } from '@/context/AuthContext';
import { useModel } from '@/context/ModelContext';
import { createClient } from '@/lib/supabase/client';
import Overview from '@/components/panels/Overview';
import Model from '@/components/panels/Model';
import Actuals from '@/components/panels/Actuals';
import TeamAccess from '@/components/panels/TeamAccess';
import AuthOverlay from '@/components/auth/AuthOverlay';

const panels = {
  overview: Overview,
  model: Model,
  actuals: Actuals,
  'team-access': TeamAccess,
};

export default function AppPage() {
  const { activePanel } = useUI();
  const { user, loading } = useAuth();
  const { dispatch, markLoaded, setModelId } = useModel();

  const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

  useEffect(() => {
    if (!user) {
      if (devBypass) markLoaded();
      return;
    }
    async function loadModel() {
      const supabase = createClient();
      try {
        const { data, error } = await supabase.from('models')
          .select('id, state, created_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        if (!error && data) {
          setModelId(data.id);
          dispatch({ type: 'LOAD_STATE', payload: data.state });
        }
      } catch (e) {
        console.error('Failed to load model:', e);
      }
      markLoaded();
    }
    loadModel();
  }, [user, dispatch, markLoaded, setModelId, devBypass]);

  if (loading && !devBypass) {
    return (
      <>
        <style>{`
          @keyframes loadingPulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
        `}</style>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          height: '100vh',
          background: 'linear-gradient(145deg, #0a0e1a 0%, #0f172a 50%, #0a0e1a 100%)',
        }}>
          <div style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 36,
            fontWeight: 700,
            color: '#f1f5f9',
            animation: 'loadingPulse 2s ease-in-out infinite',
          }}>
            Runway<span style={{ color: '#6366f1', fontWeight: 400 }}>.fyi</span>
          </div>
        </div>
      </>
    );
  }

  if (!user && !devBypass) {
    return <AuthOverlay />;
  }

  const PanelComponent = panels[activePanel] || Overview;
  return <PanelComponent />;
}
