'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [memberRole, setMemberRole] = useState(null);
  const [currentModelId, setCurrentModelId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trialStartDate, setTrialStartDate] = useState(null);
  const [trialEndDate, setTrialEndDate] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  useEffect(() => {
    const supabase = createClient();

    async function initAuth() {
      const timer = setTimeout(() => setLoading(false), 3000);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await checkSubscription(session.user);
        }
      } catch (e) {
        console.warn('Auth init:', e.message);
      }
      clearTimeout(timer);
      setLoading(false);
    }

    async function checkSubscription(authUser) {
      try {
        const { data, error } = await supabase.from('subscriptions')
          .select('status, trial_start, trial_end')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (!error && data) {
          setSubscriptionStatus(data.status);
          setIsPro(data.status === 'active');
          if (data.trial_start) setTrialStartDate(new Date(data.trial_start));
          if (data.trial_end) setTrialEndDate(new Date(data.trial_end));
        } else {
          setIsPro(false);
          setSubscriptionStatus(null);
        }
      } catch {
        setIsPro(false);
        setSubscriptionStatus(null);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await checkSubscription(session.user);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsPro(false);
          setMemberRole(null);
          setCurrentModelId(null);
          setTrialStartDate(null);
          setTrialEndDate(null);
          setSubscriptionStatus(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  function signOut() {
    // Clear localStorage
    Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k));
    // Clear cookies
    document.cookie.split(';').forEach(c => {
      const name = c.trim().split('=')[0];
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
    window.location.reload();
  }

  async function sendMagicLink(email) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/auth/callback' }
    });
    if (error) throw error;
  }

  const value = {
    user,
    isPro,
    memberRole,
    setMemberRole,
    currentModelId,
    setCurrentModelId,
    loading,
    trialStartDate,
    setTrialStartDate,
    trialEndDate,
    setTrialEndDate,
    subscriptionStatus,
    signOut,
    sendMagicLink,
    setIsPro,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
