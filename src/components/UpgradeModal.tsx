import { useNavigate } from 'react-router-dom';
import { X, Zap, Lock, TrendingUp, BarChart2, BookOpen, History, ChevronRight } from 'lucide-react';
import { useTier } from '../contexts/TierContext';

const LOCKED_FEATURES = [
  { icon: <BarChart2 className="w-4 h-4" />,  label: 'Unlimited Chart Analysis',    color: '#00D4FF' },
  { icon: <TrendingUp className="w-4 h-4" />, label: 'All AI Hot Picks Signals',    color: '#F59E0B' },
  { icon: <BookOpen className="w-4 h-4" />,   label: 'Trading Journal + AI Coach',  color: '#A78BFA' },
  { icon: <History className="w-4 h-4" />,    label: 'Full Trade History Analytics', color: '#34D399' },
];

export function UpgradeModal() {
  const { showUpgrade, upgradeFeature, closeUpgrade } = useTier();
  const navigate = useNavigate();

  if (!showUpgrade) return null;

  const handleUpgrade = () => {
    closeUpgrade();
    navigate('/pricing');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm"
        onClick={closeUpgrade}
        style={{ animation: 'fadeInBackdrop 0.2s ease' }}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="relative w-full max-w-md rounded-3xl overflow-hidden"
          style={{
            pointerEvents: 'all',
            background: 'linear-gradient(135deg, #111318 0%, #0D0F14 100%)',
            border: '1px solid rgba(245,158,11,0.25)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 60px rgba(245,158,11,0.08)',
            animation: 'modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <style>{`
            @keyframes fadeInBackdrop { from { opacity: 0; } to { opacity: 1; } }
            @keyframes modalIn {
              from { opacity: 0; transform: scale(0.88) translateY(20px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>

          {/* Amber glow top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(245,158,11,0.15) 0%, transparent 70%)' }} />

          {/* Close */}
          <button onClick={closeUpgrade}
            className="absolute top-4 right-4 p-2 rounded-xl text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-all z-10">
            <X className="w-4 h-4" />
          </button>

          <div className="relative p-8">
            {/* Lock icon */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <Lock className="w-7 h-7 text-amber-400" />
              </div>
            </div>

            {/* Headline */}
            <div className="text-center mb-6">
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: 'white', marginBottom: '8px' }}>
                Elite Feature
              </h2>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(148,163,184,0.8)', lineHeight: '1.5' }}>
                <span className="text-amber-400 font-medium capitalize">{upgradeFeature}</span> is available on the Elite Trader plan.
                Upgrade to unlock everything.
              </p>
            </div>

            {/* What you unlock */}
            <div className="space-y-2 mb-6">
              {LOCKED_FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex-shrink-0" style={{ color: f.color }}>{f.icon}</div>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(203,213,225,0.9)' }}>
                    {f.label}
                  </span>
                  <Zap className="w-3.5 h-3.5 text-amber-400 ml-auto flex-shrink-0" />
                </div>
              ))}
            </div>

            {/* Price teaser */}
            <div className="text-center mb-5 px-4 py-3 rounded-2xl"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#6B7280', letterSpacing: '1px' }}>
                ELITE TRADER ·
              </span>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px', color: '#F59E0B', marginLeft: '8px' }}>
                $97
              </span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B7280' }}>/mo</span>
            </div>

            {/* CTA */}
            <button onClick={handleUpgrade}
              className="w-full py-4 rounded-2xl font-bold text-black text-base flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                fontFamily: 'Syne, sans-serif',
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                boxShadow: '0 8px 32px rgba(245,158,11,0.3)',
              }}>
              Upgrade to Elite
              <ChevronRight className="w-5 h-5" />
            </button>

            <button onClick={closeUpgrade}
              className="w-full mt-3 py-2.5 rounded-xl text-sm text-gray-600 hover:text-gray-400 transition-all"
              style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
