// src/pages/PaymentSuccessPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function PaymentSuccessPage() {
  const { user, profile, refreshProfile } = useAuth() as any;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [confirmed, setConfirmed] = useState(false);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!user) { setPolling(false); return; }
    if (profile?.subscription_tier === 'elite') { setConfirmed(true); setPolling(false); return; }

    let attempts = 0;
    const maxAttempts = 15;

    const poll = async () => {
      attempts++;
      try {
        const { data } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
        if (data?.subscription_tier === 'elite') {
          setConfirmed(true); setPolling(false);
          if (refreshProfile) await refreshProfile();
          return true;
        }
      } catch (err) { console.error('Poll error:', err); }
      if (attempts >= maxAttempts) { setPolling(false); return true; }
      return false;
    };

    const interval = setInterval(async () => { const done = await poll(); if (done) clearInterval(interval); }, 2000);
    return () => clearInterval(interval);
  }, [user, profile]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          {polling ? (
            <div className="inline-flex p-4 bg-yellow-500/20 rounded-full"><Loader2 className="w-10 h-10 text-yellow-400 animate-spin" /></div>
          ) : confirmed ? (
            <div className="inline-flex p-4 bg-green-500/20 rounded-full"><CheckCircle className="w-10 h-10 text-green-400" /></div>
          ) : (
            <div className="inline-flex p-4 bg-yellow-500/20 rounded-full"><Zap className="w-10 h-10 text-yellow-400" /></div>
          )}
        </div>

        <h1 className="text-3xl font-bold mb-3">
          {polling ? 'Activating your account...' : confirmed ? 'Elite Trader activated!' : 'Payment successful!'}
        </h1>
        <p className="text-gray-400 mb-8">
          {polling ? 'Confirming your subscription with Stripe. This takes a few seconds.'
            : confirmed ? 'Your Elite Trader account is live. Full access unlocked.'
            : 'Payment received. Your account will be upgraded within a minute — check your email.'}
        </p>

        {!polling && (
          <div className="space-y-3">
            {confirmed && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 text-left">
                <div className="font-semibold text-yellow-400 mb-2 flex items-center gap-2"><Zap className="w-4 h-4" />What's unlocked</div>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>⚡ Full Hot Picks signal feed — all symbols</li>
                  <li>⚡ AI Data Analysis — unlimited scans</li>
                  <li>⚡ 30-day signal history</li>
                  <li>⚡ Standard + Micro contract sizing</li>
                </ul>
              </div>
            )}
            <button onClick={() => navigate('/dashboard')} className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold rounded-xl transition-all">Go to Dashboard →</button>
            <button onClick={() => navigate('/futures-basics')} className="w-full py-3 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 font-medium rounded-xl transition-all text-sm">Start Futures Basics Education</button>
          </div>
        )}
      </div>
    </div>
  );
}
