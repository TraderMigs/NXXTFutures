// src/pages/SignupPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle, Loader2, Share2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function SignupPage() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirm]   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [done, setDone]                 = useState(false);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tierParam = searchParams.get('tier');
  const isEliteIntent = tierParam === 'elite';

  // ── Capture referral code from ?ref= and persist to localStorage ──
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode && refCode.trim()) {
      localStorage.setItem('nxxt_ref', refCode.trim().toUpperCase());
    }
  }, [searchParams]);

  const referrerBadge = searchParams.get('ref')?.toUpperCase() ?? null;

  useEffect(() => {
    document.title = 'Create Account — NXXT Futures';
    return () => { document.title = 'NXXT Futures'; };
  }, []);

  if (user) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setProgressMessage('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      setProgressMessage(isEliteIntent ? 'Creating your account...' : 'Creating account...');

      // Read stored referral code right before signup
      const storedRef = localStorage.getItem('nxxt_ref') ?? undefined;

      const { error: signUpError } = await signUp(email, password, storedRef);
      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes('already registered')) {
          setError('An account with this email already exists. Try signing in.');
        } else {
          setError(signUpError.message || 'Sign up failed. Try again.');
        }
        return;
      }

      // Clear stored ref after successful signup
      localStorage.removeItem('nxxt_ref');

      if (isEliteIntent) {
        // Immediately fire Stripe checkout — no email gate
        setProgressMessage('Connecting to Stripe...');

        const { data, error: checkoutError } = await supabase.functions.invoke('create-signup-checkout', {
          body: { email },
        });

        if (checkoutError) {
          console.error('[SignupPage] Checkout error:', checkoutError);
          setError('Account created! Failed to connect to payment. Please sign in and upgrade from the pricing page.');
          setLoading(false);
          setProgressMessage('');
          return;
        }

        if (data?.url) {
          setProgressMessage('Redirecting to secure payment...');
          window.location.href = data.url;
          return;
        } else {
          setError('Account created! Failed to create payment session. Please sign in and upgrade from the pricing page.');
          setLoading(false);
          setProgressMessage('');
          return;
        }
      }

      // Free signup — show email confirmation screen
      setDone(true);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <button onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-300 transition-all text-sm"
          style={{ fontFamily: 'DM Sans' }}>
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center">
              <span className="font-display font-bold text-amber-400 text-sm">NF</span>
            </div>
            <div>
              <div className="font-display font-bold text-xl text-white tracking-tight">NXXT Futures</div>
              <div className="font-data text-[10px] text-amber-500/70 tracking-[0.2em] uppercase">Create Account</div>
            </div>
          </div>
          {isEliteIntent ? (
            <p className="text-amber-400 text-sm font-semibold">One step away from Elite Trader.</p>
          ) : (
            <p className="text-gray-500 text-sm">Free forever. Upgrade to Elite anytime.</p>
          )}
        </div>

        {/* Referral badge — shown when arriving via a referral link */}
        {referrerBadge && !done && (
          <div className="mb-4 flex items-center gap-2.5 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <Share2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-400 text-xs font-semibold">You were referred by a friend!</p>
              <p className="text-gray-500 text-xs mt-0.5">Code: <span className="font-mono text-green-300">{referrerBadge}</span></p>
            </div>
          </div>
        )}

        {/* Free signup success state */}
        {done ? (
          <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-8 text-center">
            <div className="inline-flex p-3 bg-green-500/20 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              We sent a confirmation link to <strong className="text-white">{email}</strong>. Click it to activate your account, then come back to sign in.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-display font-bold py-3 rounded-xl transition-all text-sm"
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-8">
            {isEliteIntent && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                <p className="text-amber-400 text-xs font-semibold">🏆 Elite Trader — $97/month</p>
                <p className="text-gray-500 text-xs mt-1">Create account → Stripe checkout → Verify email → Enter app</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#0A0B0D] border border-[#1E2128] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-[#0A0B0D] border border-[#1E2128] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                    placeholder="Min. 8 characters"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    className="w-full bg-[#0A0B0D] border border-[#1E2128] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-black font-display font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {progressMessage || 'Creating account...'}
                  </>
                ) : isEliteIntent ? (
                  'Create Account & Continue to Payment'
                ) : (
                  'Create Free Account'
                )}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-gray-700 text-xs mt-6">
          Private use only · NXXTFutures.com
        </p>
        <div className="text-center mt-4">
          <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#4B5563' }}>
            Already have an account?{' '}
          </span>
          <button onClick={() => navigate('/login')}
            style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#F59E0B', textDecoration: 'underline' }}>
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
