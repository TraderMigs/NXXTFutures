// src/pages/PaymentSuccessPage.tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, Zap, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type Status = 'processing' | 'verified' | 'timeout';

export function PaymentSuccessPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('processing');
  const [attempts, setAttempts] = useState(0);
  const sessionId = searchParams.get('session_id');
  const pollingRef = useRef(false);
  const refreshRef = useRef(refreshProfile);
  refreshRef.current = refreshProfile;
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    document.title = 'Payment Confirmed — NXXT Futures';
    return () => { document.title = 'NXXT Futures'; };
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = true;

    const maxAttempts = 30;
    let currentAttempts = 0;

    const checkSubscription = async () => {
      try {
        currentAttempts++;
        setAttempts(currentAttempts);

        const { data } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', userRef.current!.id)
          .single();

        if (data?.subscription_tier === 'elite') {
          await refreshRef.current();
          setStatus('verified');
          pollingRef.current = false;
          clearInterval(intervalId);
          return;
        }

        if (currentAttempts >= maxAttempts) {
          setStatus('timeout');
          pollingRef.current = false;
          clearInterval(intervalId);
        }
      } catch {
        if (currentAttempts >= maxAttempts) {
          setStatus('timeout');
          pollingRef.current = false;
          clearInterval(intervalId);
        }
      }
    };

    checkSubscription();
    const intervalId = setInterval(checkSubscription, 2000);
    return () => { clearInterval(intervalId); pollingRef.current = false; };
  }, []);

  useEffect(() => {
    // CASE 1: No session_id AND no user — arrived at page directly with nothing to do
    if (!sessionId && !userRef.current) {
      setStatus('verified');
      return;
    }

    // CASE 2: Has session_id but no user — brand new signup just paid, email not verified yet
    // Show success immediately with "verify your email" notice
    if (sessionId && !userRef.current) {
      setStatus('verified');
      return;
    }

    // CASE 3: User is logged in (either came from AuthConfirmPage redirect OR existing upgrade)
    // Start polling regardless of whether session_id is present
    // AuthConfirmPage redirects here WITHOUT session_id after email confirmation
    if (userRef.current) {
      const cleanup = startPolling();
      return () => { if (cleanup) cleanup(); };
    }
  }, [sessionId, startPolling, user]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        {status === 'processing' && (
          <>
            <div className="inline-flex p-4 bg-yellow-500/20 rounded-full mb-6">
              <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Activating your account...</h1>
            <p className="text-gray-400 mb-6">Confirming your subscription with Stripe. This takes a few seconds.</p>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden max-w-xs mx-auto">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${(attempts / 30) * 100}%` }}
              />
            </div>
            <p className="text-gray-600 text-xs mt-3">Attempt {attempts} of 30</p>
          </>
        )}

        {status === 'verified' && (
          <>
            <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Payment Successful!</h1>
            <p className="text-gray-400 mb-8">Your Elite Trader subscription has been activated.</p>

            {!user && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-white font-semibold mb-1">One last step — verify your email</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      We sent a verification link to your email. Click it to activate your account, then sign in to access your Elite Trader dashboard.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 text-left">
              <div className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />What's unlocked
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>⚡ Full Hot Picks signal feed — all symbols</li>
                <li>⚡ AI Data Analysis — unlimited scans</li>
                <li>⚡ 30-day signal history</li>
                <li>⚡ Standard + Micro contract sizing</li>
              </ul>
            </div>

            {user ? (
              <button
                onClick={() => navigate('/app')}
                className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold rounded-xl transition-all"
              >
                Go to Dashboard →
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold rounded-xl transition-all"
              >
                Sign In to Dashboard →
              </button>
            )}
          </>
        )}

        {status === 'timeout' && (
          <>
            <div className="inline-flex p-4 bg-yellow-500/20 rounded-full mb-6">
              <Zap className="w-10 h-10 text-yellow-400" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Payment received!</h1>
            <p className="text-gray-400 mb-6">Your payment was successful. Subscription activation is taking a little longer than usual — it will complete within a minute.</p>
            <div className="space-y-3">
              <button
                onClick={() => { setStatus('processing'); setAttempts(0); pollingRef.current = false; startPolling(); }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />Check Again
              </button>
              <button
                onClick={() => navigate('/app')}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 font-medium rounded-xl transition-all text-sm"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
