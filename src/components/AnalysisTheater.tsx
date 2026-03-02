import { useState, useEffect, useRef } from 'react';

// ── Trading facts / trivia ─────────────────────────────────────────────────────
const FACTS = [
  { emoji: '🏦', title: 'What is an Order Block?', body: 'An Order Block is the last opposing candle before a big price move. Banks leave a footprint here — they can\'t fill massive orders in one candle, so price returns to grab the rest.' },
  { emoji: '💧', title: 'Why Do Liquidity Sweeps Happen?', body: 'Algorithms know exactly where retail stop losses cluster — just above swing highs and below swing lows. They sweep those levels to collect cheap inventory before reversing. Classic trap move.' },
  { emoji: '📐', title: 'What is a Fair Value Gap (FVG)?', body: 'When price moves so fast it skips over an area with almost no trades, it leaves an imbalance. Price loves to come back and fill that gap — it\'s basically a magnet on the chart.' },
  { emoji: '🏗️', title: 'Break of Structure (BOS) vs ChoCh', body: 'BOS = trend continuation (structure broke in the direction we\'re going). ChoCh = trend reversal (character of the market just changed). The ChoCh is where the real money is made.' },
  { emoji: '📊', title: 'Why Smart Money Concepts Work', body: 'SMC is based on how banks and institutions ACTUALLY move markets — not lagging indicators. ICT (Michael Huddleston) reverse-engineered the playbook. Retail uses RSI. Smart money uses structure.' },
  { emoji: '⚡', title: 'The New York Session is King', body: 'NY session (8am-5pm EST) accounts for ~33% of all daily forex and futures volume. The 9:30am NYSE open creates the highest-probability SMC setups of the day. Don\'t trade at 3am.' },
  { emoji: '🎯', title: 'Why ATR Matters for Stops', body: 'ATR (Average True Range) tells you how much a market moves on average. A stop tighter than 1x ATR will get hunted. Your stop loss should breathe — tight stops are bait for algorithms.' },
  { emoji: '💰', title: 'The ES Point Value', body: 'The E-mini S&P 500 (ES) moves $50 per point. NQ is $20/point. A 10-point ES move = $500 per contract. This is why position sizing is more important than entry timing.' },
  { emoji: '🧠', title: 'Only 2-3% Are Consistently Profitable', body: 'Not because markets are hard — because most traders revenge trade, oversize, and skip stops. The edge is psychological, not technical. Boring consistent risk management beats genius entries every time.' },
  { emoji: '🌊', title: 'Higher Timeframe Always Wins', body: 'A perfect 15M setup in the middle of a 4H downtrend is like swimming upstream. The HTF bias is the current. Trade with it and setups become 2-3x more reliable. Always zoom out first.' },
  { emoji: '🚀', title: 'What is the Moon Lander?', body: 'It\'s our proprietary name for the Yahoo Finance data API. Fetches real-time OHLCV candle data for futures markets. 100% free. 100% live. 100% powering every analysis you see here.' },
  { emoji: '🎲', title: 'Risk-Reward Ratio is Everything', body: 'A trader who is right 40% of the time but uses 1:3 R:R makes more money than one who is right 70% using 1:1. You don\'t need to be accurate — you need asymmetric bets.' },
  { emoji: '🕐', title: 'The Killzone Hours', body: 'London Open (3-5am EST), NY Open (9:30-11am EST), and London Close (10am-12pm EST) are the highest-probability windows. Most valid SMC setups form in these windows. Outside them — be skeptical.' },
];

// ── Processing steps with Migs\' personality ──────────────────────────────────
const STEPS = [
  { icon: '🚀', label: 'Connecting to the Moon Lander...',       duration: 1200 },
  { icon: '📡', label: 'Downloading live candle data...',         duration: 2000 },
  { icon: '🔭', label: 'Scanning 4H structure for HTF bias...',   duration: 2500 },
  { icon: '🧱', label: 'Identifying Order Blocks...',             duration: 2000 },
  { icon: '💧', label: 'Hunting liquidity sweeps...',             duration: 1800 },
  { icon: '📐', label: 'Sniffing out Fair Value Gaps...',         duration: 1500 },
  { icon: '📏', label: 'Calculating ATR(14) volatility...',       duration: 1200 },
  { icon: '🧠', label: 'Feeding raw data to the AI brain...',     duration: 3000 },
  { icon: '🔍', label: 'AI scanning for SMC confluence...',       duration: 4000 },
  { icon: '⚡', label: 'Building your trade setup...',            duration: 2000 },
  { icon: '✅', label: 'Finalizing levels & position sizing...',  duration: 1500 },
];

// ── Animated candlestick chart ────────────────────────────────────────────────
function ScannerAnimation({ symbol }: { symbol: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const timeRef   = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    // Generate fake candles
    type Candle = { o: number; h: number; l: number; c: number; vol: number };
    const candles: Candle[] = [];
    let price = 100;
    for (let i = 0; i < 40; i++) {
      const open  = price;
      const delta = (Math.random() - 0.48) * 6;
      const close = open + delta;
      const high  = Math.max(open, close) + Math.random() * 3;
      const low   = Math.min(open, close) - Math.random() * 3;
      candles.push({ o: open, h: high, l: low, c: close, vol: 0.3 + Math.random() * 0.7 });
      price = close;
    }

    const priceMin = Math.min(...candles.map(c => c.l)) - 5;
    const priceMax = Math.max(...candles.map(c => c.h)) + 5;
    const priceRange = priceMax - priceMin;
    const toY = (p: number) => H * 0.85 - ((p - priceMin) / priceRange) * H * 0.7;

    const candleW = (W * 0.82) / candles.length;
    const candleX = (i: number) => W * 0.06 + i * candleW + candleW * 0.2;

    // SMC levels
    const obMin = 91, obMax = 95;
    const tp1 = 108, tp2 = 115, tp3 = 121;
    const sl  = 88;

    let tick = 0;

    const draw = (t: number) => {
      tick = t;
      ctx.clearRect(0, 0, W, H);

      // Background grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const y = H * 0.1 + i * H * 0.15;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Draw candles
      candles.forEach((c, i) => {
        const x  = candleX(i);
        const cW = candleW * 0.55;
        const oY = toY(c.o), cY = toY(c.c), hY = toY(c.h), lY = toY(c.l);
        const isBull = c.c >= c.o;
        const alpha = 0.3 + 0.7 * Math.min(1, (t - i * 30) / 300);
        if (alpha <= 0) return;

        ctx.globalAlpha = alpha;
        // Wick
        ctx.strokeStyle = isBull ? '#34d399' : '#f87171';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + cW / 2, hY); ctx.lineTo(x + cW / 2, lY); ctx.stroke();
        // Body
        ctx.fillStyle = isBull ? 'rgba(52,211,153,0.7)' : 'rgba(248,113,113,0.7)';
        ctx.fillRect(x, Math.min(oY, cY), cW, Math.max(1, Math.abs(cY - oY)));
        ctx.globalAlpha = 1;
      });

      // Scanner beam sweeping across
      const scanX = (((t * 0.4) % (W * 1.2)) - W * 0.1);
      const beamGrad = ctx.createLinearGradient(scanX - 60, 0, scanX + 60, 0);
      beamGrad.addColorStop(0,   'rgba(251,191,36,0)');
      beamGrad.addColorStop(0.5, 'rgba(251,191,36,0.12)');
      beamGrad.addColorStop(1,   'rgba(251,191,36,0)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(scanX - 60, 0, 120, H);

      // Horizontal levels
      const drawLevel = (price: number, color: string, label: string, dash = false) => {
        const y = toY(price);
        if (y < 0 || y > H) return;
        ctx.save();
        ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
        if (dash) ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(W * 0.05, y); ctx.lineTo(W * 0.94, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.85;
        ctx.font = 'bold 10px monospace'; ctx.fillStyle = color;
        ctx.fillText(label, W * 0.95, y + 4);
        ctx.restore();
      };

      // Entry zone band
      const obY1 = toY(obMin), obY2 = toY(obMax);
      ctx.save();
      ctx.globalAlpha = 0.08 + 0.05 * Math.sin(t * 0.02);
      ctx.fillStyle = '#00BFFF';
      ctx.fillRect(W * 0.05, Math.min(obY1, obY2), W * 0.89, Math.abs(obY2 - obY1));
      ctx.restore();

      const showLevels = t > 400;
      if (showLevels) {
        drawLevel(tp3, '#00994d', 'TP3');
        drawLevel(tp2, '#00cc66', 'TP2');
        drawLevel(tp1, '#00ff88', 'TP1');
        drawLevel(obMax, '#00BFFF', 'ENTRY', true);
        drawLevel(obMin, '#00BFFF', '', true);
        drawLevel(sl,   '#FF4444', 'SL');
      }

      // Pulsing dot at current price
      const curY = toY(candles[candles.length - 1].c);
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.05);
      ctx.beginPath();
      ctx.arc(W * 0.92, curY, 5 + pulse * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(251,191,36,${0.15 * pulse})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(W * 0.92, curY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FBbF24'; ctx.fill();

      // Symbol watermark
      ctx.save();
      ctx.font = 'bold 48px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.textAlign = 'center';
      ctx.fillText(symbol, W / 2, H / 2 + 16);
      ctx.restore();
    };

    const animate = (ts: number) => {
      timeRef.current = ts;
      draw(ts / 16);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameRef.current);
  }, [symbol]);

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />;
}

// ── Main component ─────────────────────────────────────────────────────────────
export function AnalysisTheater({ symbol }: { symbol: string }) {
  const [currentStep,  setCurrentStep]  = useState(0);
  const [doneSteps,    setDoneSteps]    = useState<number[]>([]);
  const [factIndex,    setFactIndex]    = useState(() => Math.floor(Math.random() * FACTS.length));
  const [factVisible,  setFactVisible]  = useState(true);
  const [elapsedSecs,  setElapsedSecs]  = useState(0);

  // Progress through steps
  useEffect(() => {
    let stepIdx = 0;
    let cancelled = false;

    const advance = () => {
      if (cancelled || stepIdx >= STEPS.length) return;
      setCurrentStep(stepIdx);
      const dur = STEPS[stepIdx].duration;
      setTimeout(() => {
        if (cancelled) return;
        setDoneSteps(prev => [...prev, stepIdx]);
        stepIdx++;
        if (stepIdx < STEPS.length) advance();
        else setCurrentStep(STEPS.length - 1);
      }, dur);
    };
    advance();

    return () => { cancelled = true; };
  }, []);

  // Rotate facts every 9 seconds with fade
  useEffect(() => {
    const interval = setInterval(() => {
      setFactVisible(false);
      setTimeout(() => {
        setFactIndex(i => (i + 1) % FACTS.length);
        setFactVisible(true);
      }, 400);
    }, 9000);
    return () => clearInterval(interval);
  }, []);

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsedSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fact = FACTS[factIndex];
  const progress = Math.round((doneSteps.length / STEPS.length) * 100);

  return (
    <div className="flex flex-col items-center justify-start w-full space-y-5 py-2">

      {/* ── Chart animation box ──────────────────────────────────────── */}
      <div className="w-full rounded-2xl border border-[#1E2128] overflow-hidden bg-[#0A0B0D] relative"
           style={{ height: '220px' }}>
        <ScannerAnimation symbol={symbol} />
        {/* Header overlay */}
        <div className="absolute top-3 left-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-data text-[10px] text-amber-400 font-bold tracking-widest uppercase">
            Live Scanner · {symbol}
          </span>
        </div>
        {/* Timer */}
        <div className="absolute top-3 right-4">
          <span className="font-data text-[10px] text-gray-600">{elapsedSecs}s</span>
        </div>
        {/* Progress bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E2128]">
          <div
            className="h-full bg-amber-400 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Processing steps ────────────────────────────────────────── */}
      <div className="w-full bg-[#111318] border border-[#1E2128] rounded-2xl p-4 space-y-1.5">
        <div className="text-[10px] text-gray-600 uppercase tracking-wider font-display mb-3">
          What the engine is doing right now
        </div>
        {STEPS.map((step, i) => {
          const isDone    = doneSteps.includes(i);
          const isCurrent = currentStep === i && !isDone;
          const isPending = !isDone && !isCurrent;
          return (
            <div key={i}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
                isCurrent ? 'bg-amber-500/10 border border-amber-500/20' :
                isDone    ? 'opacity-50' : 'opacity-20'
              }`}
            >
              {/* Status icon */}
              <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                {isDone ? (
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-700" />
                )}
              </div>
              {/* Step icon + label */}
              <span className="text-base leading-none">{step.icon}</span>
              <span className={`font-data text-xs ${isCurrent ? 'text-amber-300 font-semibold' : isDone ? 'text-gray-500' : 'text-gray-700'}`}>
                {step.label}
              </span>
              {isCurrent && (
                <span className="ml-auto flex gap-0.5">
                  {[0,1,2].map(d => (
                    <span key={d} className="w-1 h-1 rounded-full bg-amber-400 animate-bounce"
                      style={{ animationDelay: `${d * 0.15}s` }} />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Trading fact card ────────────────────────────────────────── */}
      <div
        className="w-full bg-[#111318] border border-amber-500/15 rounded-2xl p-5 transition-all duration-400"
        style={{ opacity: factVisible ? 1 : 0, transform: factVisible ? 'translateY(0)' : 'translateY(6px)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{fact.emoji}</span>
          <span className="font-display font-bold text-xs text-amber-400 uppercase tracking-wider">
            Did You Know?
          </span>
          <span className="ml-auto font-data text-[10px] text-gray-700">
            {factIndex + 1} / {FACTS.length}
          </span>
        </div>
        <div className="font-semibold text-sm text-white mb-1.5">{fact.title}</div>
        <div className="text-xs text-gray-400 leading-relaxed">{fact.body}</div>

        {/* Fact dots */}
        <div className="flex items-center gap-1 mt-3 justify-center">
          {FACTS.map((_, i) => (
            <div key={i}
              className={`rounded-full transition-all duration-300 ${i === factIndex ? 'w-4 h-1.5 bg-amber-400' : 'w-1.5 h-1.5 bg-[#1E2128]'}`}
            />
          ))}
        </div>
      </div>

      {/* ── Bottom tagline ───────────────────────────────────────────── */}
      <p className="text-[11px] text-gray-700 text-center font-data">
        Moon Lander data · Claude AI · SMC methodology · {elapsedSecs}s elapsed
      </p>
    </div>
  );
}
