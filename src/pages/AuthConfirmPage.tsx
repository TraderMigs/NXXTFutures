// src/pages/AuthConfirmPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function AuthConfirmPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your email...');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const handleConfirmation = async () => {
      try {
        // Read token_hash and type from URL query params (?token_hash=...&type=signup)
        const searchParams = new URLSearchParams(window.location.search);
        const tokenHash = searchParams.get('token_hash');
        const type      = searchParams.get('type');

        if (tokenHash && type === 'signup') {

          // Step 1: Verify the OTP token — this creates a real session
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'signup',
          });

          if (verifyError || !data.session) {
            setStatus('error');
            setMessage('Confirmation link is expired or already used. Please sign in or request a new link.');
            return;
          }

          const confirmedUser = data.session.user;

          // Step 2: Read profile to determine routing
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_tier, pending_tier, stripe_customer_id')
            .eq('id', confirmedUser.id)
            .maybeSingle();

          // PRIORITY 1: Already Elite — go straight to app
          if (profile?.subscription_tier === 'elite') {
            setStatus('success');
            setMessage('Email confirmed! Taking you to your Elite dashboard...');
            startCountdown(() => navigate('/app'));
            return;
          }

          // PRIORITY 2: Pending Elite + already paid (stripe_customer_id exists)
          // Payment went through, webhook may still be processing
          if (profile?.pending_tier === 'elite' && profile?.stripe_customer_id) {
            setStatus('success');
            setMessage('Email confirmed! Your Elite subscription is being activated...');
            startCountdown(() => navigate('/payment-success'));
            return;
          }

          // PRIORITY 3: Pending Elite + no payment yet — send to pricing to complete checkout
          if (profile?.pending_tier === 'elite' && !profile?.stripe_customer_id) {
            setStatus('success');
            setMessage('Email confirmed! Redirecting to complete your Elite Trader checkout...');
            startCountdown(() => navigate('/pricing?checkout=elite'));
            return;
          }

          // DEFAULT: Free account — go to app
          setStatus('success');
          setMessage('Email confirmed! Taking you to your dashboard...');
          startCountdown(() => navigate('/app'));

        } else {
          // No token_hash in URL — user navigated here directly or link is malformed
          setStatus('error');
          setMessage('Invalid confirmation link. Please use the link from your email.');
        }

      } catch (err) {
        console.error('[AuthConfirmPage] Error:', err);
        setStatus('error');
        setMessage('Something went wrong. Please try signing in manually.');
      }
    };

    handleConfirmation();
  }, [navigate]);

  const startCountdown = (onComplete: () => void) => {
    let count = 3;
    setCountdown(count);
    const timer = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        onComplete();
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">

        <div className="inline-flex items-center gap-2 mb-10">
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center">
            <span className="font-bold text-amber-400 text-sm">NF</span>
          </div>
          <div className="text-left">
            <div className="font-bold text-xl text-white tracking-tight">NXXT Futures</div>
            <div className="text-[10px] text-amber-500/70 tracking-[0.2em] uppercase">Email Confirmation</div>
          </div>
        </div>

        <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-8">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-amber-400" />
              <p className="text-gray-300">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="w-12 h-12 mx-auto text-green-400" />
              <div>
                <p className="text-lg font-bold text-green-400 mb-2">Confirmed!</p>
                <p className="text-gray-300 text-sm">{message}</p>
                <p className="text-gray-600 text-xs mt-3">Redirecting in {countdown}s...</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <XCircle className="w-12 h-12 mx-auto text-red-400" />
              <div>
                <p className="text-lg font-bold text-red-400 mb-2">Confirmation Failed</p>
                <p className="text-gray-300 text-sm">{message}</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl transition-all text-sm mt-4"
              >
                Go to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
