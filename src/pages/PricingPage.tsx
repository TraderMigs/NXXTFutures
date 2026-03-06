// src/pages/PricingPage.tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Loader2, Zap, Shield, TrendingUp, BookOpen, Gift, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function PricingPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [promoCode,     setPromoCode]     = useState('');
  const [promoApplied,  setPromoApplied]  = useState(false);
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null); // e.g. 50 for 50%
  const [promoMessage,  setPromoMessage]  = useState('');
  const [promoError,    setPromoError]    = useState('');
  const [promoLoading,  setPromoLoading]  = useState(false);

  // Auto-apply promo from URL param ?promo=CODE
  useEffect(() => {
    const promoParam = searchParams.get('promo');
    if (promoParam) {
      setPromoCode(promoParam.toUpperCase());
      handleApplyPromo(promoParam.toUpperCase());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-apply promo from quiz graduation
  useEffect(() => {
    if (!user) return;
    const checkPromo = async () => {
      const { data } = await supabase
        .from('quiz_promo_redemptions')
        .select('promo_code, redeemed, expires_at')
        .eq('user_id', user.id)
        .single();
      if (data && !data.redeemed && new Date(data.expires_at) > new Date()) {
        setPromoCode(data.promo_code);
        handleApplyPromo(data.promo_code);
      }
    };
    checkPromo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  const isElite = profile?.subscription_tier === 'elite';

  // ─── Real promo validation ────────────────────────────────
  const handleApplyPromo = async (codeToApply?: string) => {
    const code = (codeToApply ?? promoCode).trim().toUpperCase();
    if (!code) { setPromoError('Please enter a promo code.'); return; }

    setPromoLoading(true);
    setPromoError('');
    setPromoMessage('');

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('validate-promo-code', {
        body: { code },
      });

      if (invokeError) throw new Error(invokeError.message);

      if (data?.valid) {
        setPromoApplied(true);
        setPromoDiscount(data.discount_percent ?? null);
        setPromoMessage(data.message ?? `${data.discount_percent}% off applied!`);
        setPromoCode(code);
      } else {
        setPromoApplied(false);
        setPromoDiscount(null);
        setPromoError(data?.error ?? 'Invalid promo code.');
      }
    } catch (err) {
      setPromoError('Could not validate code. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoApplied(false);
    setPromoDiscount(null);
    setPromoCode('');
    setPromoMessage('');
    setPromoError('');
  };

  // Discounted price display
  const discountedPrice = promoDiscount ? (97 * (1 - promoDiscount / 100)).toFixed(2) : null;

  const handleSubscribe = useCallback(async () => {
    if (!user) { navigate('/signup?tier=elite'); return; }
    if (isElite) { navigate('/app'); return; }
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) { setError('Session expired. Please sign out and sign back in.'); return; }
    setLoading(true); setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('create-signup-checkout', {
        body: promoApplied && promoCode ? { promo_code: promoCode } : {},
      });
      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);
      if (data?.url) { window.location.href = data.url; }
      else throw new Error('No checkout URL returned');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setLoading(false);
    }
  }, [user, isElite, promoApplied, promoCode, navigate]);

  // Auto-fire checkout when arriving from AuthConfirmPage with ?checkout=elite
  useEffect(() => {
    const checkoutParam = searchParams.get('checkout');
    if (checkoutParam === 'elite' && user && !isElite && !loading) {
      handleSubscribe();
    }
  }, [user, isElite, searchParams, handleSubscribe, loading]);

  const handleGetStarted = () => {
    if (!user) { navigate('/signup?tier=free'); return; }
    navigate('/app');
  };

  useEffect(() => {
    document.title = 'Pricing — NXXT Futures';
    return () => { document.title = 'NXXT Futures'; };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto max-w-5xl px-4 pt-16 pb-20">
        <div className="mb-8">
          <button onClick={() => navigate(user ? '/app' : '/')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />Back to {user ? 'Dashboard' : 'Home'}
          </button>
        </div>

        {error && (
          <div className="mb-6 max-w-2xl mx-auto p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
        )}

        {/* Promo applied banner */}
        {promoApplied && promoCode && !isElite && (
          <div className="mb-8 max-w-2xl mx-auto p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
            <Gift className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-green-400 font-semibold text-sm">
                Promo applied — <span className="font-mono">{promoCode}</span>
              </p>
              <p className="text-green-400/70 text-xs mt-0.5">{promoMessage}</p>
            </div>
            <button onClick={handleRemovePromo} className="text-green-600 hover:text-green-400 transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Simple, Honest Pricing</h1>
          <p className="text-lg text-gray-400">AI-powered futures signals during peak institutional hours. No fluff, no noise.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* FREE */}
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-1">Free Trader</h3>
              <p className="text-gray-400 text-sm">Explore the platform</p>
            </div>
            <div className="text-5xl font-bold mb-8">$0<span className="text-xl text-gray-400">/month</span></div>
            <ul className="space-y-3 mb-8">
              {[
                'Live Hot Picks signal feed (limited)',
                'Futures Basics education (free forever)',
                'Position size calculator (unlimited)',
                'Standard contract sizing',
                'Signal age & status indicators',
              ].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <button onClick={handleGetStarted} className="w-full py-3 border border-gray-600 hover:border-gray-400 rounded-xl font-semibold text-sm transition-colors">
              {user ? 'Go to Dashboard' : 'Get Started Free'}
            </button>
          </div>

          {/* ELITE */}
          <div className="bg-gray-900 border-2 border-yellow-500/60 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-amber-500 text-black px-4 py-1.5 text-xs font-bold rounded-bl-xl">⚡ FULL ACCESS</div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-1">Elite Trader</h3>
              <p className="text-gray-400 text-sm">Everything, unlimited</p>
            </div>

            {/* Price display */}
            <div className="mb-8">
              {promoApplied && discountedPrice ? (
                <div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-bold text-green-400">${discountedPrice}</span>
                    <span className="text-gray-400 text-sm line-through">$97</span>
                  </div>
                  <p className="text-green-400 text-xs mt-1">first month · then $97/month</p>
                </div>
              ) : (
                <div className="text-5xl font-bold">$97<span className="text-xl text-gray-400">/month</span></div>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {[
                { text: 'Full Hot Picks feed — all symbols, all signals',        bold: true  },
                { text: 'AI Data Analysis — unlimited on-demand scans',          bold: true  },
                { text: '30-day signal history & performance tracking',          bold: true  },
                { text: 'Standard + Micro contract sizing toggle',               bold: true  },
                { text: 'Position size calculator (unlimited)',                  bold: false },
                { text: 'Futures Basics education + graduation badge',           bold: false },
                { text: 'London & NY session signals only (highest quality)',    bold: false },
                { text: 'New features as they ship',                             bold: false },
              ].map(item => (
                <li key={item.text} className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${item.bold ? 'text-yellow-400' : 'text-gray-500'}`} />
                  <span className={`text-sm ${item.bold ? 'text-white font-medium' : 'text-gray-400'}`}>{item.text}</span>
                </li>
              ))}
            </ul>

            {/* Promo code input — shown to logged-in users who don't have a promo applied */}
            {!promoApplied && !isElite && (
              <div className="mb-4 space-y-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') handleApplyPromo(); }}
                    className="flex-1 px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition-colors"
                  />
                  <button
                    onClick={() => handleApplyPromo()}
                    disabled={promoLoading || !promoCode.trim()}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                  >
                    {promoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                  </button>
                </div>
                {promoError && <p className="text-red-400 text-xs pl-1">{promoError}</p>}
              </div>
            )}

            <button
              onClick={handleSubscribe}
              disabled={loading || isElite}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                isElite
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                  : 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Processing...</span>
              ) : isElite ? "✓ You're on Elite Trader"
                : user
                  ? promoApplied ? `Upgrade — ${promoDiscount}% Off First Month` : 'Upgrade to Elite Trader'
                  : 'Start Elite Trader'}
            </button>
            <p className="text-center text-xs text-gray-600 mt-3">Cancel anytime · No contracts · Secure via Stripe</p>
          </div>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16">
          {[
            { icon: Zap,       color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   title: 'Peak Hours Only',   desc: 'London (3–7 AM EST) and NY (7–11 AM EST) only — where 80% of institutional volume lives.' },
            { icon: Shield,    color: 'text-yellow-400', bg: 'bg-yellow-500/10', title: 'SMC Methodology',   desc: 'Every signal built on Order Blocks, FVGs, Liquidity, and multi-timeframe confluence.' },
            { icon: TrendingUp,color: 'text-green-400',  bg: 'bg-green-500/10',  title: 'Any Account Size', desc: 'Standard and Micro contract sizing. Trade with $500 or $500,000 — signals work for both.' },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="text-center p-6">
                <div className={`inline-flex p-3 rounded-xl ${card.bg} mb-4`}><Icon className={`w-6 h-6 ${card.color}`} /></div>
                <h4 className="font-bold mb-2">{card.title}</h4>
                <p className="text-sm text-gray-400">{card.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Education CTA */}
        <div className="max-w-2xl mx-auto mt-12 p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center">
          <div className="text-3xl mb-3">🏅</div>
          <h3 className="font-bold text-lg mb-2">Complete Futures Basics → Earn 50% Off</h3>
          <p className="text-gray-400 text-sm mb-4">Free for all users. Finish all 8 sections and get <strong className="text-white">GRADUATE50</strong> — 50% off your first month. Valid 7 days.</p>
          <button onClick={() => navigate('/futures-basics')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-amber-400 font-semibold text-sm transition-colors">
            <BookOpen className="w-4 h-4" />Start Futures Basics →
          </button>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              { q: 'When are signals generated?', a: 'NXXT Futures scans every hour during London (3–7 AM EST) and New York (7–11 AM EST) sessions, Monday through Friday. These are peak institutional liquidity windows.' },
              { q: 'What futures markets are covered?', a: 'Equity indexes (ES, NQ, YM, RTY and micros MES, MNQ, MYM, M2K), metals (GC, SI and micros MGC, SIL), energy (CL, NG and micro MCL), FX futures, rates, and crypto futures.' },
              { q: 'What are micro contracts?', a: 'Micro E-mini contracts are 1/10th the size of standard E-minis — same chart, same levels, smaller position value. Essential for smaller accounts. Elite users can toggle between standard and micro sizing on every signal card.' },
              { q: 'How does the AI generate signals?', a: 'Each signal analyzes structure (BOS/CHoCH), order blocks, fair value gaps, and liquidity across 3 timeframes (Daily, 4H, 1H). We only output signals with 78%+ confidence where all three timeframes align.' },
              { q: 'What is the GRADUATE50 promo?', a: 'Complete all 8 sections of Futures Basics (free for everyone) and earn 50% off your first month of Elite Trader. Code is emailed automatically and valid for 7 days.' },
              { q: 'Can I cancel anytime?', a: 'Yes — cancel from your billing settings anytime. Access continues until end of your billing period.' },
            ].map(item => (
              <div key={item.q} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-bold mb-2 text-white">{item.q}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
