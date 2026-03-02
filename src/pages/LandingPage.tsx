import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// Canvas: Deep Space — shooting tickers, stars, laser lines
// ─────────────────────────────────────────────────────────────────────────────
function SpaceCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf: number;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Stars ──────────────────────────────────────────────────────────────
    type Star = { x: number; y: number; r: number; alpha: number; speed: number };
    const stars: Star[] = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.2,
      alpha: Math.random() * 0.6 + 0.1,
      speed: Math.random() * 0.15 + 0.02,
    }));

    // ── Shooting tickers ──────────────────────────────────────────────────
    const TICKERS = ['ES', 'NQ', 'GC', 'CL', 'NKD', 'RTY', 'YM', 'SI', 'ZB', 'MES', 'MNQ', 'BTC'];
    type Comet = {
      x: number; y: number; vx: number; vy: number;
      ticker: string; alpha: number; life: number; maxLife: number;
      trailLen: number; color: string;
    };
    const comets: Comet[] = [];

    const spawnComet = () => {
      const angle = (Math.random() * 60 - 30) * Math.PI / 180; // -30° to +30° from horizontal
      const speed = Math.random() * 5 + 3;
      const side  = Math.random() > 0.5 ? 1 : -1;
      const colors = ['#F59E0B', '#00D4FF', '#34D399', '#A78BFA', '#FB923C'];
      comets.push({
        x: side > 0 ? -50 : canvas.width + 50,
        y: Math.random() * canvas.height * 0.8 + canvas.height * 0.1,
        vx: speed * Math.cos(angle) * side,
        vy: speed * Math.sin(angle) + (Math.random() - 0.5) * 1.5,
        ticker: TICKERS[Math.floor(Math.random() * TICKERS.length)],
        alpha: 0,
        life: 0,
        maxLife: Math.random() * 180 + 120,
        trailLen: Math.random() * 80 + 40,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    };

    // ── Laser price lines ────────────────────────────────────────────────
    type Laser = { y: number; x1: number; x2: number; alpha: number; color: string; life: number; maxLife: number };
    const lasers: Laser[] = [];

    const spawnLaser = () => {
      lasers.push({
        y: Math.random() * canvas.height,
        x1: Math.random() * canvas.width * 0.4,
        x2: Math.random() * canvas.width * 0.4 + canvas.width * 0.6,
        alpha: 0,
        color: Math.random() > 0.5 ? '#F59E0B' : '#00D4FF',
        life: 0,
        maxLife: Math.random() * 120 + 80,
      });
    };

    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── Nebula background glow ──────────────────────────────────────
      const grad1 = ctx.createRadialGradient(
        canvas.width * 0.15, canvas.height * 0.3, 0,
        canvas.width * 0.15, canvas.height * 0.3, canvas.width * 0.5
      );
      grad1.addColorStop(0, 'rgba(245,158,11,0.07)');
      grad1.addColorStop(0.5, 'rgba(245,158,11,0.03)');
      grad1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grad2 = ctx.createRadialGradient(
        canvas.width * 0.85, canvas.height * 0.7, 0,
        canvas.width * 0.85, canvas.height * 0.7, canvas.width * 0.4
      );
      grad2.addColorStop(0, 'rgba(0,212,255,0.06)');
      grad2.addColorStop(0.5, 'rgba(0,212,255,0.02)');
      grad2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center deep amber pulse
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.008);
      const grad3 = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.5, 0,
        canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.6
      );
      grad3.addColorStop(0, `rgba(245,158,11,${0.02 + pulse * 0.02})`);
      grad3.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ── Stars ───────────────────────────────────────────────────────
      stars.forEach(s => {
        s.y -= s.speed;
        if (s.y < 0) { s.y = canvas.height; s.x = Math.random() * canvas.width; }
        const twinkle = s.alpha * (0.7 + 0.3 * Math.sin(frame * 0.02 + s.x));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
        ctx.fill();
      });

      // ── Spawn comets ────────────────────────────────────────────────
      if (frame % 25 === 0 && comets.length < 18) spawnComet();
      if (frame % 90 === 0 && lasers.length < 6) spawnLaser();

      // ── Draw lasers ─────────────────────────────────────────────────
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.life++;
        const progress = l.life / l.maxLife;
        l.alpha = progress < 0.2
          ? progress / 0.2
          : progress > 0.8
          ? (1 - progress) / 0.2
          : 1;

        ctx.save();
        ctx.globalAlpha = l.alpha * 0.25;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 12]);
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y);
        ctx.lineTo(l.x2, l.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        if (l.life >= l.maxLife) lasers.splice(i, 1);
      }

      // ── Draw comets ─────────────────────────────────────────────────
      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        c.life++;
        c.x += c.vx;
        c.y += c.vy;
        c.alpha = c.life < 20
          ? c.life / 20
          : c.life > c.maxLife - 20
          ? (c.maxLife - c.life) / 20
          : 1;

        // Trail - safe gradient avoiding color parse errors
        const trailX = c.x - c.vx * 15;
        const trailY = c.y - c.vy * 15;
        ctx.save();
        ctx.globalAlpha = c.alpha * 0.8;
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();

        // Ticker label
        ctx.globalAlpha = c.alpha;
        ctx.font = `bold 11px "DM Mono", monospace`;
        ctx.fillStyle = c.color;
        ctx.fillText(c.ticker, c.x + 6, c.y - 4);

        // Dot
        ctx.beginPath();
        ctx.arc(c.x, c.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.fill();

        // Glow
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        const oob = c.x < -100 || c.x > canvas.width + 100 || c.y < -100 || c.y > canvas.height + 100;
        if (c.life >= c.maxLife || oob) comets.splice(i, 1);
      }

      frame++;
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated signal card
// ─────────────────────────────────────────────────────────────────────────────
type CardData = { symbol: string; direction: 'BUY' | 'SELL'; confidence: number; timeframe: string; setup: string; color: string };

const SIGNAL_CARDS: CardData[] = [
  { symbol: 'ES',  direction: 'SELL', confidence: 84, timeframe: '1H', setup: 'OB Rejection @ 5820', color: '#EF4444' },
  { symbol: 'NQ',  direction: 'BUY',  confidence: 91, timeframe: '1H', setup: 'Liquidity Sweep + FVG', color: '#34D399' },
  { symbol: 'GC',  direction: 'BUY',  confidence: 78, timeframe: '4H', setup: 'HTF OB + ChoCh', color: '#34D399' },
  { symbol: 'CL',  direction: 'SELL', confidence: 82, timeframe: '1H', setup: 'BOS + OB Retest', color: '#EF4444' },
  { symbol: 'RTY', direction: 'BUY',  confidence: 87, timeframe: '1H', setup: 'MSS + FVG Fill', color: '#34D399' },
];

function FloatingSignalCard({ card, index }: { card: CardData; index: number }) {
  return (
    <div
      className="flex-shrink-0 w-56"
      style={{
        animation: `floatCard ${3 + index * 0.5}s ease-in-out infinite alternate`,
        animationDelay: `${index * 0.4}s`,
      }}
    >
      <div className="relative rounded-2xl overflow-hidden border border-white/10 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
          boxShadow: `0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}>
        <div className={`h-0.5 w-full`} style={{ background: `linear-gradient(90deg, ${card.color}, ${card.color}88)` }} />
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-display font-bold text-white text-lg">{card.symbol}</div>
              <div className="font-data text-[10px] text-gray-500">{card.timeframe} · SMC</div>
            </div>
            <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border`}
              style={{
                color: card.color,
                background: card.color + '15',
                borderColor: card.color + '40',
              }}>
              {card.direction}
            </div>
          </div>
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-gray-600">Confidence</span>
              <span className="font-data text-xs font-bold" style={{ color: card.color }}>{card.confidence}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full" style={{ width: `${card.confidence}%`, background: `linear-gradient(90deg, ${card.color}99, ${card.color})` }} />
            </div>
          </div>
          <div className="text-[10px] text-gray-500 font-data">{card.setup}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Counter animation
// ─────────────────────────────────────────────────────────────────────────────
function Counter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        let start = 0;
        const step = target / 60;
        const t = setInterval(() => {
          start += step;
          if (start >= target) { setVal(target); clearInterval(t); }
          else setVal(Math.floor(start));
        }, 16);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);

  return <div ref={ref}>{prefix}{val.toLocaleString()}{suffix}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main landing page
// ─────────────────────────────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate();
  const [heroReady, setHeroReady] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  const features = [
    {
      icon: '🔥',
      title: 'AI Hot Picks',
      sub: 'Live SMC Signals',
      desc: 'Institutional-grade signals generated by a proprietary software calibration of Claude AI Anthropic's API by a 12-year trader; scanning 50 futures markets every hour. Order blocks, liquidity sweeps, FVGs — automatically identified and ranked.',
      accent: '#F59E0B',
      tags: ['ES · NQ · GC · CL', '85%+ Confidence Only', 'Auto-Refreshing'],
    },
    {
      icon: '📡',
      title: 'Data Analysis',
      sub: 'Chart Intelligence',
      desc: 'Select any futures symbol, hit analyze — and NXXT fetches live OHLCV data, Claude AI dissects it across 3 timeframes, and returns a full SMC trade setup in under 60 seconds.',
      accent: '#00D4FF',
      tags: ['50 Futures Markets', '3-TF Analysis', 'Position Sizing Calc'],
    },
    {
      icon: '📔',
      title: 'Trading Journal',
      sub: 'AI Coaching',
      desc: 'Log your trades, emotional state, and execution. After every entry, AI Coach reads the full journal and gives you honest, direct feedback on patterns you\'re too close to see.',
      accent: '#A78BFA',
      tags: ['Emotional Tracking', 'AI Feedback', 'Pattern Detection'],
    },
    {
      icon: '📊',
      title: 'Trade History',
      sub: 'Performance Analytics',
      desc: 'Every analysis auto-saved. Mark outcomes — TP1, TP2, TP3, stopped out. Watch your real win rate emerge over time. Know exactly which symbols and setups are your edge.',
      accent: '#34D399',
      tags: ['Auto-Saved', 'Outcome Tracking', 'Win Rate Analytics'],
    },
  ];

  const stats = [
    { label: 'Futures Markets Covered', value: 50, suffix: '+' },
    { label: 'SMC Signals Generated', value: 1247, suffix: '' },
    { label: 'Average Confidence Score', value: 84, suffix: '%' },
    { label: 'Analyses Completed', value: 3891, suffix: '' },
  ];

  return (
    <div className="relative min-h-screen bg-[#04050A] overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes floatCard {
          from { transform: translateY(0px) rotate(-0.5deg); }
          to   { transform: translateY(-12px) rotate(0.5deg); }
        }
        @keyframes heroLetterIn {
          from { opacity: 0; transform: translateY(40px) skewY(3deg); filter: blur(8px); }
          to   { opacity: 1; transform: translateY(0) skewY(0deg); filter: blur(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(60px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes scrollCards {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.03); }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.03; }
          50%       { opacity: 0.07; }
        }
        .hero-letter {
          display: inline-block;
          opacity: 0;
          animation: heroLetterIn 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        .shimmer-text {
          background: linear-gradient(90deg, #F59E0B 0%, #FDE68A 30%, #F59E0B 60%, #D97706 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .glass-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .btn-primary {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #F59E0B, #D97706);
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #FDE68A, #F59E0B);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .btn-primary:hover::before { opacity: 1; }
        .btn-primary:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 20px 60px rgba(245,158,11,0.4); }
        .btn-primary:active { transform: scale(0.97); }
        .btn-glass {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(20px);
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .btn-glass:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(245,158,11,0.4);
          transform: translateY(-2px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(245,158,11,0.2);
        }
        .btn-glass:active { transform: scale(0.97); }
        .feature-card {
          transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }
        .feature-card:hover {
          transform: translateY(-8px) scale(1.02);
        }
        .grid-bg {
          background-image:
            linear-gradient(rgba(245,158,11,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,158,11,0.05) 1px, transparent 1px);
          background-size: 60px 60px;
          animation: gridPulse 4s ease-in-out infinite;
        }
        .cards-scroll {
          animation: scrollCards 25s linear infinite;
        }
        .cards-scroll:hover { animation-play-state: paused; }
        @media (max-width: 639px) {
          .cards-scroll { animation-duration: 15s; }
        }
      `}</style>

      {/* Space canvas */}
      <SpaceCanvas />

      {/* Grid overlay */}
      <div className="fixed inset-0 grid-bg pointer-events-none" style={{ zIndex: 1 }} />

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <span style={{ fontFamily: 'Syne', fontWeight: 800, color: '#F59E0B', fontSize: '13px' }}>NF</span>
            </div>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, color: 'white', fontSize: '16px', letterSpacing: '-0.5px' }}>
                NXXT Futures
              </div>
              <div style={{ fontFamily: 'DM Mono', fontSize: '9px', color: '#4B5563', letterSpacing: '2px' }}>
                AI-POWERED · SMC
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'breathe 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#34D399', letterSpacing: '1px' }}>LIVE</span>
            </div>
            <button onClick={() => navigate('/login')}
              className="btn-glass px-5 py-2 rounded-xl text-sm font-medium text-gray-300" style={{ fontFamily: 'DM Sans' }}>
              Log In
            </button>
            <button
              className="btn-primary px-5 py-2 rounded-xl text-sm font-bold text-black relative"
              style={{ fontFamily: 'Syne' }}
              onClick={() => navigate('/pricing')}>
              <span className="relative z-10">Get Access</span>
            </button>
          </div>

          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-2">
            <button onClick={() => navigate('/login')}
              className="btn-glass px-3 py-2 rounded-xl text-xs text-gray-300" style={{ fontFamily: 'DM Sans' }}>
              Log In
            </button>
            <button onClick={() => navigate('/pricing')}
              className="btn-primary px-3 py-2 rounded-xl text-xs font-bold text-black relative"
              style={{ fontFamily: 'Syne' }}>
              <span className="relative z-10">Join</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16"
        style={{ zIndex: 2 }}>

        {/* Badge */}
        <div className={`mb-8 transition-all duration-700 ${heroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '0.1s' }}>
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06))',
              border: '1px solid rgba(245,158,11,0.25)',
              backdropFilter: 'blur(20px)',
            }}>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" style={{ animation: 'breathe 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'DM Mono', fontSize: '11px', color: '#F59E0B', letterSpacing: '1.5px' }}>
              POWERED BY CLAUDE AI · MOON LANDER DATA
            </span>
          </div>
        </div>

        {/* Main headline */}
        <h1 className="mb-6" style={{ lineHeight: '1.0' }}>
          {'TRADE THE'.split('').map((ch, i) => (
            <span key={i} className="hero-letter"
              style={{
                fontFamily: 'Syne',
                fontWeight: 900,
                fontSize: 'clamp(36px, 9vw, 120px)',
                color: 'white',
                whiteSpace: 'nowrap',
                animationDelay: heroReady ? `${0.2 + i * 0.04}s` : '999s',
                letterSpacing: '-2px',
              }}>
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
          <br />
          {'FUTURE.'.split('').map((ch, i) => (
            <span key={i} className="hero-letter"
              style={{
                fontFamily: 'Syne',
                fontWeight: 900,
                fontSize: 'clamp(36px, 9vw, 120px)',
                whiteSpace: 'nowrap',
                animationDelay: heroReady ? `${0.6 + i * 0.06}s` : '999s',
                letterSpacing: '-2px',
                background: 'linear-gradient(90deg, #F59E0B 0%, #FDE68A 30%, #F59E0B 60%, #D97706 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: heroReady
                  ? `heroLetterIn 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards ${0.6 + i * 0.06}s, shimmer 3s linear infinite`
                  : 'none',
              }}>
              {ch}
            </span>
          ))}
        </h1>

        {/* Subtitle */}
        <p className={`max-w-xl mb-10 transition-all duration-1000 ${heroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{
            fontFamily: 'DM Sans',
            fontSize: 'clamp(16px, 2.5vw, 20px)',
            color: 'rgba(203,213,225,0.95)',
            fontWeight: 300,
            lineHeight: '1.6',
            transitionDelay: '1s',
          }}>
          AI-powered Smart Money Concepts analysis for CME Futures.
          Live signals, chart intelligence, and a journal with an AI coach
          that doesn't hold back.
        </p>

        {/* CTAs */}
        <div className={`flex flex-col sm:flex-row items-center gap-4 mb-16 transition-all duration-1000 ${heroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transitionDelay: '1.2s' }}>

          {/* Primary CTA */}
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl"
              style={{ background: 'rgba(245,158,11,0.4)', filter: 'blur(20px)', animation: 'pulseRing 2s ease-out infinite' }} />
            <button onClick={() => navigate('/login')}
              className="btn-primary relative px-8 py-4 rounded-2xl font-bold text-black text-lg"
              style={{ fontFamily: 'Syne', minWidth: '200px', zIndex: 1 }}
              onClick={() => navigate('/pricing')}>
              <span className="relative z-10 flex items-center gap-2">
                Enter the Platform
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>

          {/* Secondary CTA */}
          <button
            className="btn-glass px-8 py-4 rounded-2xl text-base font-medium text-gray-300"
            style={{ fontFamily: 'DM Sans', minWidth: '200px' }}
            onClick={() => navigate('/pricing')}>
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
              Join the Elite
            </span>
          </button>
        </div>

        {/* Floating signal cards carousel */}
        <div className={`w-full max-w-5xl transition-all duration-1000 ${heroReady ? 'opacity-100' : 'opacity-0'}`}
          style={{ transitionDelay: '1.5s', overflow: 'hidden' }}>
          <div className="flex gap-4 cards-scroll" style={{ width: 'max-content' }}>
            {[...SIGNAL_CARDS, ...SIGNAL_CARDS].map((card, i) => (
              <FloatingSignalCard key={i} card={card} index={i % SIGNAL_CARDS.length} />
            ))}
          </div>
        </div>

        {/* Scroll cue */}
        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-1000 ${heroReady ? 'opacity-100' : 'opacity-0'}`}
          style={{ transitionDelay: '2s' }}>
          <div className="flex flex-col items-center gap-2" style={{ animation: 'floatCard 2s ease-in-out infinite alternate' }}>
            <span style={{ fontFamily: 'DM Mono', fontSize: '9px', color: '#374151', letterSpacing: '3px' }}>SCROLL</span>
            <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
              <rect x="1" y="1" width="14" height="22" rx="7" stroke="#1F2937" strokeWidth="1.5" />
              <circle cx="8" cy="7" r="2.5" fill="#F59E0B" style={{ animation: 'breathe 1.5s ease-in-out infinite' }} />
            </svg>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────── */}
      <section className="relative py-10 px-6" style={{ zIndex: 2 }}>
        <div className="max-w-5xl mx-auto">
          <div className="glass-card rounded-2xl px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((s, i) => (
                <div key={i} className="text-center">
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 40px)', color: '#F59E0B' }}>
                    <Counter target={s.value} suffix={s.suffix} />
                  </div>
                  <div style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#4B5563', letterSpacing: '1px', marginTop: '4px' }}>
                    {s.label.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="relative py-24 px-6" style={{ zIndex: 2 }}>
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <span style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#F59E0B', letterSpacing: '2px' }}>PLATFORM TOOLS</span>
            </div>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 900, fontSize: 'clamp(36px, 6vw, 72px)', color: 'white', letterSpacing: '-1px', lineHeight: '1.1' }}>
              Every tool a serious<br />
              <span className="shimmer-text">futures trader needs.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <div key={i}
                className="feature-card glass-card rounded-3xl p-7 cursor-default relative overflow-hidden"
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
                style={{
                  borderColor: hoveredFeature === i ? f.accent + '30' : 'rgba(255,255,255,0.06)',
                  boxShadow: hoveredFeature === i
                    ? `0 30px 80px ${f.accent}15, inset 0 1px 0 ${f.accent}15`
                    : '0 20px 60px rgba(0,0,0,0.4)',
                }}>

                {/* Glow accent */}
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none transition-all duration-500"
                  style={{
                    background: `radial-gradient(circle, ${f.accent}10 0%, transparent 70%)`,
                    opacity: hoveredFeature === i ? 1 : 0,
                  }} />

                <div className="flex items-start gap-4 mb-5">
                  <div className="text-3xl w-12 h-12 flex items-center justify-center rounded-xl flex-shrink-0"
                    style={{ background: f.accent + '12', border: `1px solid ${f.accent}25` }}>
                    {f.icon}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '20px', color: 'white' }}>{f.title}</div>
                    <div style={{ fontFamily: 'DM Mono', fontSize: '10px', color: f.accent, letterSpacing: '1.5px', marginTop: '2px' }}>
                      {f.sub.toUpperCase()}
                    </div>
                  </div>
                </div>

                <p style={{ fontFamily: 'DM Sans', fontSize: '14px', color: 'rgba(203,213,225,0.85)', lineHeight: '1.7', marginBottom: '20px' }}>
                  {f.desc}
                </p>

                <div className="flex flex-wrap gap-2">
                  {f.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                      style={{
                        fontFamily: 'DM Mono',
                        background: f.accent + '0D',
                        border: `1px solid ${f.accent}20`,
                        color: f.accent + 'CC',
                        letterSpacing: '0.5px',
                      }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SMC METHODOLOGY SECTION ──────────────────────────────────── */}
      <section className="relative py-24 px-6" style={{ zIndex: 2 }}>
        <div className="max-w-5xl mx-auto">
          <div className="glass-card rounded-3xl p-10 md:p-14 relative overflow-hidden">

            {/* Decorative rotating ring */}
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full pointer-events-none"
              style={{
                border: '1px solid rgba(245,158,11,0.08)',
                animation: 'rotateSlow 20s linear infinite',
              }} />
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full pointer-events-none"
              style={{
                border: '1px solid rgba(245,158,11,0.12)',
                animation: 'rotateSlow 12s linear infinite reverse',
              }} />

            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <span style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#F59E0B', letterSpacing: '2px' }}>METHODOLOGY</span>
                </div>
                <h3 style={{ fontFamily: 'Syne', fontWeight: 900, fontSize: 'clamp(28px, 4vw, 48px)', color: 'white', lineHeight: '1.1', marginBottom: '16px' }}>
                  Built on how<br />
                  <span className="shimmer-text">banks actually trade.</span>
                </h3>
                <p style={{ fontFamily: 'DM Sans', fontSize: '15px', color: 'rgba(203,213,225,0.85)', lineHeight: '1.7' }}>
                  Smart Money Concepts is the institutional playbook — Order Blocks, Liquidity Sweeps, Fair Value Gaps, Break of Structure. Not lagging indicators. Not RSI crossovers. The actual mechanics behind every major move.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Order Blocks', desc: 'Last opposing candle before impulse', color: '#F59E0B' },
                  { label: 'Liquidity Sweeps', desc: 'Stop hunts before major reversals', color: '#EF4444' },
                  { label: 'Fair Value Gaps', desc: 'Price imbalances that act as magnets', color: '#00D4FF' },
                  { label: 'Break of Structure', desc: 'Trend continuation confirmation', color: '#34D399' },
                  { label: 'Change of Character', desc: 'Early reversal signal', color: '#A78BFA' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-3.5 rounded-xl transition-all duration-300 hover:bg-white/3"
                    style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                    <div>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '14px', color: 'white' }}>{item.label}</div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#4B5563', marginTop: '1px' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <section className="relative py-24 px-6" style={{ zIndex: 2 }}>
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-14">
            <h2 style={{ fontFamily: 'Syne', fontWeight: 900, fontSize: 'clamp(36px, 5vw, 64px)', color: 'white', letterSpacing: '-1px' }}>
              <span style={{ display: 'block' }}>One tier.</span>
              <span className="shimmer-text" style={{ display: 'block' }}>All tools.</span>
            </h2>
            <p style={{ fontFamily: 'DM Sans', color: 'rgba(203,213,225,0.8)', marginTop: '12px', fontSize: '16px' }}>
              No feature-gating. No paywalled analysis.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto">

            {/* Free */}
            <div className="glass-card rounded-3xl p-8">
              <div style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#4B5563', letterSpacing: '2px', marginBottom: '12px' }}>FREE TRADER</div>
              <div style={{ fontFamily: 'Syne', fontWeight: 900, fontSize: '40px', color: 'white' }}>$0</div>
              <div style={{ fontFamily: 'DM Sans', color: 'rgba(148,163,184,0.5)', fontSize: '12px', marginTop: '4px', marginBottom: '24px' }}>Forever free</div>
              {['5 analyses per month', 'Hot Picks feed', 'Basic journal'].map(item => (
                <div key={item} className="flex items-center gap-3 mb-3">
                  <div className="w-4 h-4 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3l2 2 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#6B7280' }}>{item}</span>
                </div>
              ))}
              <button onClick={() => navigate('/login')} className="btn-glass mt-6 w-full py-3 rounded-xl text-sm text-gray-400" style={{ fontFamily: 'DM Sans' }}>
                Get Started Free
              </button>
            </div>

            {/* Elite */}
            <div className="relative rounded-3xl p-8 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06))',
                border: '1px solid rgba(245,158,11,0.3)',
                boxShadow: '0 30px 80px rgba(245,158,11,0.15)',
              }}>
              <div className="absolute top-4 right-4">
                <div className="px-2.5 py-1 rounded-full text-[9px] font-bold"
                  style={{ background: '#F59E0B', color: 'black', fontFamily: 'Syne' }}>
                  ELITE
                </div>
              </div>
              <div style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#F59E0B', letterSpacing: '2px', marginBottom: '12px' }}>ELITE TRADER</div>
              <div style={{ fontFamily: 'Syne', fontWeight: 900, fontSize: '40px', color: 'white' }}>$99<span style={{ fontSize: '18px', fontWeight: 400, color: '#6B7280' }}>/mo</span></div>
              <div style={{ fontFamily: 'DM Sans', color: 'rgba(148,163,184,0.5)', fontSize: '12px', marginTop: '4px', marginBottom: '24px' }}>Cancel anytime</div>
              {['Unlimited analyses', 'Live AI Hot Picks', 'Full trading journal', 'AI Coach feedback', 'Trade history analytics', 'Priority updates'].map(item => (
                <div key={item} className="flex items-center gap-3 mb-3">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)' }}>
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3l2 2 4-4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{item}</span>
                </div>
              ))}
              <div className="relative mt-6">
                <div className="absolute inset-0 rounded-xl" style={{ background: 'rgba(245,158,11,0.3)', filter: 'blur(12px)' }} />
                <button onClick={() => navigate('/pricing')}
                  className="btn-primary relative w-full py-3 rounded-xl font-bold text-black text-sm"
                  style={{ fontFamily: 'Syne', zIndex: 1 }}>
                  <span className="relative z-10">Start Elite Free Trial</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="relative py-32 px-6 text-center" style={{ zIndex: 2 }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(245,158,11,0.06) 0%, transparent 70%)',
          }} />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <div style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#F59E0B', letterSpacing: '3px', marginBottom: '24px' }}>
            STOP TRADING BLIND
          </div>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 900, fontSize: 'clamp(40px, 8vw, 96px)', color: 'white', letterSpacing: '-2px', lineHeight: '1.0', marginBottom: '24px' }}>
            Your edge starts<br />
            <span className="shimmer-text">right now.</span>
          </h2>
          <p style={{ fontFamily: 'DM Sans', fontSize: '18px', color: 'rgba(203,213,225,0.8)', marginBottom: '40px', lineHeight: '1.6' }}>
            Join traders using institutional SMC methodology,<br className="hidden md:block" />
            AI analysis, and a journal that holds them accountable.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl"
                style={{ background: 'rgba(245,158,11,0.5)', filter: 'blur(24px)', animation: 'pulseRing 2s ease-out infinite' }} />
              <button onClick={() => navigate('/login')}
                className="btn-primary relative px-10 py-5 rounded-2xl font-bold text-black text-xl"
                style={{ fontFamily: 'Syne', zIndex: 1, minWidth: '260px' }}
                onClick={() => navigate('/pricing')}>
                <span className="relative z-10">Enter NXXT Futures →</span>
              </button>
            </div>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 flex-wrap">
            {['No indicators', 'No lagging signals', 'Pure SMC', 'AI-powered'].map(tag => (
              <div key={tag} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-400" />
                <span style={{ fontFamily: 'DM Mono', fontSize: '11px', color: '#374151', letterSpacing: '1px' }}>{tag.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="relative py-8 px-6 border-t" style={{ zIndex: 2, borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <span style={{ fontFamily: 'Syne', fontWeight: 800, color: '#F59E0B', fontSize: '10px' }}>NF</span>
            </div>
            <span style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#1F2937', letterSpacing: '1px' }}>
              NXXT FUTURES · NOT FINANCIAL ADVICE · TRADE AT YOUR OWN RISK
            </span>
          </div>
          <div style={{ fontFamily: 'DM Mono', fontSize: '10px', color: '#1F2937', letterSpacing: '1px' }}>
            © 2026 NXXT FUTURES. ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>

    </div>
  );
}
