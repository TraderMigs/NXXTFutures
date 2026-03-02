import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Check, Lock } from 'lucide-react';

const FREE_FEATURES = [
  { label: '1 Hot Pick daily (at NY Open)', included: true },
  { label: 'View all platform tabs', included: true },
  { label: 'Unlimited chart analyses', included: false },
  { label: 'All AI Hot Picks signals', included: false },
  { label: 'Trading Journal + AI Coach', included: false },
  { label: 'Trade History & analytics', included: false },
];

const ELITE_FEATURES = [
  { label: 'Unlimited chart analyses', included: true },
  { label: 'All AI Hot Picks — every signal', included: true },
  { label: 'Trading Journal + AI Coach feedback', included: true },
  { label: 'Full trade history & win rate analytics', included: true },
  { label: 'Position sizing calculator', included: true },
  { label: 'Outcome tracking & performance stats', included: true },
];

export function PricingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#04050A] relative overflow-x-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #F59E0B 0%, #FDE68A 30%, #F59E0B 60%, #D97706 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '400px',
          background: 'radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)',
        }} />
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 px-6 py-4"
        style={{ background: 'rgba(4,5,10,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-white/5"
            style={{ color: '#6B7280', fontSize: '14px', fontFamily: 'DM Sans' }}>
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:block">Back</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <span style={{ fontFamily: 'Syne', fontWeight: 800, color: '#F59E0B', fontSize: '11px' }}>NF</span>
            </div>
            <span style={{ fontFamily: 'Syne', fontWeight: 800, color: 'white', fontSize: '15px' }}>NXXT Futures</span>
          </div>
        </div>
      </nav>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <section className="pt-16 pb-12 px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#F59E0B', letterSpacing: '2px' }}>
            CHOOSE YOUR PLAN
          </span>
        </div>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 900, fontSize: 'clamp(32px, 6vw, 64px)', color: 'white', letterSpacing: '-1px', lineHeight: '1.1', marginBottom: '12px' }}>
          Start free.<br />
          <span className="shimmer-text">Go Elite when ready.</span>
        </h1>
        <p style={{ fontFamily: 'DM Sans', fontSize: '16px', color: 'rgba(148,163,184,0.8)', maxWidth: '480px', margin: '0 auto' }}>
          Free Trader gets you in the door. Elite Trader gives you everything — unlimited analysis, all signals, AI coaching, and full analytics.
        </p>
      </section>

      {/* ── Pricing cards ────────────────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-5">

          {/* ── Free Trader ──────────────────────────────────────────── */}
          <div className="rounded-3xl p-8 relative"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
            <div style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#4B5563', letterSpacing: '2px', marginBottom: '16px' }}>
              FREE TRADER
            </div>
            <div className="flex items-end gap-2 mb-1">
              <span style={{ fontFamily: 'Syne', fontWeight: 900, fontSize: '52px', color: 'white', lineHeight: '1' }}>$0</span>
            </div>
            <div style={{ fontFamily: 'DM Sans', color: '#4B5563', fontSize: '13px', marginBottom: '28px' }}>
              Forever free · No card required
            </div>

            <div className="space-y-3 mb-8">
              {FREE_FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center ${f.included ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-gray-800 border border-gray-700'}`}>
                    {f.included
                      ? <Check className="w-2.5 h-2.5 text-emerald-400" />
                      : <Lock className="w-2 h-2 text-gray-600" />
                    }
                  </div>
                  <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: f.included ? 'rgba(203,213,225,0.9)' : '#374151' }}>
                    {f.label}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all hover:bg-white/8 active:scale-[0.98]"
              style={{
                fontFamily: 'DM Sans',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(203,213,225,0.8)',
              }}>
              Get Started Free
            </button>
          </div>

          {/* ── Elite Trader ─────────────────────────────────────────── */}
          <div className="rounded-3xl p-8 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))',
              border: '1px solid rgba(245,158,11,0.3)',
              boxShadow: '0 30px 80px rgba(245,158,11,0.12)',
            }}>

            {/* Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)' }} />

            {/* Badge */}
            <div className="absolute top-5 right-5">
              <div className="px-2.5 py-1 rounded-full text-[9px] font-bold flex items-center gap-1"
                style={{ background: '#F59E0B', color: 'black', fontFamily: 'Syne' }}>
                <Zap className="w-2.5 h-2.5" />
                ELITE
              </div>
            </div>

            <div style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#F59E0B', letterSpacing: '2px', marginBottom: '16px' }}>
              ELITE TRADER
            </div>
            <div className="flex items-end gap-2 mb-1">
              <span style={{ fontFamily: 'Syne', fontWeight: 900, fontSize: '52px', color: 'white', lineHeight: '1' }}>$97</span>
              <span style={{ fontFamily: 'DM Sans', color: '#6B7280', fontSize: '16px', marginBottom: '6px' }}>/month</span>
            </div>
            <div style={{ fontFamily: 'DM Sans', color: 'rgba(148,163,184,0.6)', fontSize: '13px', marginBottom: '28px' }}>
              Cancel anytime · Instant access
            </div>

            <div className="space-y-3 mb-8">
              {ELITE_FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center bg-amber-500/20 border border-amber-500/30">
                    <Check className="w-2.5 h-2.5 text-amber-400" />
                  </div>
                  <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'rgba(203,213,225,0.9)' }}>
                    {f.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ background: 'rgba(245,158,11,0.3)', filter: 'blur(16px)' }} />
              <button
                onClick={() => navigate('/login')}
                className="relative w-full py-4 rounded-2xl font-bold text-black text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  fontFamily: 'Syne',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  boxShadow: '0 8px 24px rgba(245,158,11,0.3)',
                  zIndex: 1,
                }}>
                Start Elite — $97/mo
              </button>
            </div>

            <p className="text-center mt-3" style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#4B5563' }}>
              No contracts · Cancel anytime
            </p>
          </div>
        </div>

        {/* Compare note */}
        <div className="max-w-4xl mx-auto mt-8 text-center">
          <p style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#1F2937', letterSpacing: '1px' }}>
            COMPARABLE TOOLS COST $80–$300/MO AND DELIVER FAR LESS · NXXT IS BUILT BY A 12-YEAR TRADER
          </p>
        </div>
      </section>

      {/* ── FAQ lite ─────────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          {[
            { q: 'What does Free Trader get me?', a: 'One Hot Pick signal per day delivered at the NY Open (9:30 AM EST) when a qualifying setup is available. You can also browse all platform tabs in view-only mode to see exactly what Elite offers.' },
            { q: 'Can I cancel Elite anytime?', a: 'Yes. No contracts, no questions asked. Cancel from your account settings and your access continues until the end of the billing period.' },
            { q: 'How are signals generated?', a: 'A proprietary calibration of Claude AI (Anthropic\'s API) built by a 12-year futures trader scans 50 futures markets every hour using Smart Money Concepts — identifying Order Blocks, Liquidity Sweeps, and FVGs in real time.' },
            { q: 'Is this financial advice?', a: 'No. NXXT Futures is an analytical tool. All signals are educational and informational. Always do your own research and trade responsibly.' },
          ].map((faq, i) => (
            <div key={i} className="p-5 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '14px', color: 'white', marginBottom: '8px' }}>
                {faq.q}
              </div>
              <div style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'rgba(148,163,184,0.8)', lineHeight: '1.6' }}>
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
