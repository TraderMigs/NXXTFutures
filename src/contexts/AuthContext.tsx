// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ── Payout method type ────────────────────────────────────────
export interface PayoutMethod {
  id: string;
  type: string;
  details: string;
  primary: boolean;
}

// ── Profile type ──────────────────────────────────────────────
interface Profile {
  id: string;
  email: string;
  subscription_tier: 'free' | 'elite';
  pending_tier: string | null;
  is_admin: boolean;
  bypass_stripe: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  education_badge_earned: boolean;
  education_badge_earned_at: string | null;
  education_completion_pct: number;
  referral_code: string | null;
  referral_slug: string | null;
  referral_display_name: string | null;
  payout_methods: PayoutMethod[] | null;
  tos_accepted_at: string | null;
  tos_version: string | null;
  age_verified: boolean;
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
  signUp: (email: string, password: string, referralCode?: string) => Promise<{ error: Error | null }>;
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

  // ── signUp — accepts optional referralCode (slug OR legacy code) ──
  const signUp = async (email: string, password: string, referralCode?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (!error && data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: email,
          subscription_tier: 'free',
          pending_tier: null,
          is_admin: false,
          bypass_stripe: false,
        }, { onConflict: 'id' });

        // ── Referral tracking: try slug first, then legacy code ──────
        if (referralCode) {
          try {
            let referrerId: string | null = null;

            // 1. Try slug (lowercase)
            const { data: bySlug } = await supabase
              .from('profiles')
              .select('id')
              .eq('referral_slug', referralCode.toLowerCase())
              .single();

            if (bySlug?.id) {
              referrerId = bySlug.id;
            } else {
              // 2. Fall back to legacy auto-generated code (uppercase)
              const { data: byCode } = await supabase
                .from('profiles')
                .select('id')
                .eq('referral_code', referralCode.toUpperCase())
                .single();
              if (byCode?.id) referrerId = byCode.id;
            }

            if (referrerId && referrerId !== data.user.id) {
              await supabase.from('referrals').insert({
                referrer_id:    referrerId,
                referred_email: email,
                referred_id:    data.user.id,
                status:         'pending',
              });
              console.info(`[Auth] Referral recorded: ${referralCode} → ${email}`);
            }
          } catch (refErr) {
            // Non-critical — never block signup over a referral error
            console.warn('[Auth] Referral record failed (non-fatal):', refErr);
          }
        }

        // ── Welcome email ─────────────────────────────────────────────
        try {
          await supabase.functions.invoke('send-email', {
            body: { type: 'welcome', email: email },
          });
        } catch {
          console.warn('send-email edge function not available — skipped');
        }

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

      const currentProfile = profile;
      if (currentProfile?.stripe_subscription_id) {
        try {
          await supabase.functions.invoke('cancel-stripe-subscription', {
            body: { subscription_id: currentProfile.stripe_subscription_id },
          });
        } catch (cancelErr) {
          console.error('Stripe cancellation failed during account deletion:', cancelErr);
        }
      }

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
