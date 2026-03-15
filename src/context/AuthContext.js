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

  useEffect(() => {
    const supabase = createClient();

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await checkSubscription(session.user);
        }
      } catch (e) {
        console.warn('Auth init:', e.message);
      }
      setLoading(false);
    }

    async function checkSubscription(authUser) {
      try {
        const { data, error } = await supabase.from('subscriptions')
          .select('status')
          .eq('user_id', authUser.id)
          .in('status', ['active', 'trialing'])
          .limit(1)
          .single();
        setIsPro(!error && !!data);
      } catch {
        setIsPro(false);
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
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Sign out timeout')), 3000)),
      ]);
    } catch (e) {
      console.error('Sign out error:', e);
    }
    setUser(null);
    setIsPro(false);
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
