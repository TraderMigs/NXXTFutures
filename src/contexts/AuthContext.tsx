// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ── Profile type ──────────────────────────────────────────────
interface Profile {
  id: string;
  email: string;
  subscription_tier: 'free' | 'elite';
  is_admin: boolean;
  bypass_stripe: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  education_badge_earned: boolean;
  education_badge_earned_at: string | null;
  education_completion_pct: number;
  created_at: string;
  updated_at: string;
}

// ── Context type ──────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setProfile(data as Profile);
    } catch (err) {
      console.error('Error loading profile:', err);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await loadProfile(user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) await loadProfile(data.user.id);
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (!error && data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: email,
          subscription_tier: 'free',
          is_admin: false,
          bypass_stripe: false,
        }, { onConflict: 'id' });
        await supabase.functions.invoke('send-email', {
          body: { type: 'welcome', email: email },
        });
        await loadProfile(data.user.id);
      }
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateEmail = async (newEmail: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const deleteAccount = async () => {
    try {
      if (!user) return { error: new Error('Not logged in') };
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      if (profileError) throw profileError;
      await supabase.auth.signOut();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      signIn, signUp, signOut, refreshProfile,
      updatePassword, updateEmail, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
