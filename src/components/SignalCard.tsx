import { useState } from 'react';
import {
  TrendingUp, TrendingDown, CheckCircle2, XCircle, Clock,
  Copy, Check, AlertTriangle, Zap, BarChart3, ChevronDown, ChevronUp,
  Target, Star, BookOpen, Shield, DollarSign, HelpCircle,
  AlertOctagon, ArrowRight
} from 'lucide-react';
import { FuturesSignal } from '../lib/supabase';
import { FUTURES_MAP, formatFuturesPrice, calcContracts } from '../lib/futuresSymbols';

interface SignalCardProps {
  signal: FuturesSignal;
  accountBalance: number;
  riskPercent: number;
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ value, label }: { value: string | number; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} title={`Copy ${label || value}`}
      className={`ml-1.5 p-1 rounded transition-all duration-150 ${copied ? 'bg-amber-500/20 text-amber-400' : 'text-gray-700 hover:text-gray-400 hover:bg-white/10'}`}>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ── Tab selector ──────────────────────────────────────────────────────────────
function DetailTabs({ active, onChange }: { active: 'elite' | 'newbie'; onChange: (t: 'elite' | 'newbie') => void }) {
  return (
    <div className="flex gap-1 p-1 bg-[#0A0B0D] rounded-xl border border-[#1E2128] mb-3">
      <button onClick={() => onChange('elite')}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-display font-bold transition-all ${active === 'elite' ? 'bg-amber-500 text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
        <Star className="w-3 h-3" /> Elite Details
      </button>
      <button onClick={() => onChange('newbie')}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-display font-bold transition-all ${active === 'newbie' ? 'bg-cyan-500 text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
        <BookOpen className="w-3 h-3" /> Newbie Details
      </button>
    </div>
  );
}

// ── Newbie card wrapper ───────────────────────────────────────────────────────
function NCard({ icon, title, children, color = 'amber' }: { icon: React.ReactNode; title: string; children: React.ReactNode; color?: string }) {
  const borders: Record<string, string> = {
    amber: 'border-amber-500/20 bg-amber-500/5',
    cyan:  'border-cyan-500/20 bg-cyan-500/5',
    green: 'border-emerald-500/20 bg-emerald-500/5',
    red:   'border-red-500/20 bg-red-500/5',
    blue:  'border-blue-500/20 bg-blue-500/5',
    purple:'border-purple-500/20 bg-purple-500/5',
  };
  const titles: Record<string, string> = {
    amber: 'text-amber-400', cyan: 'text-cyan-400', green: 'text-emerald-400',
    red: 'text-red-400', blue: 'text-blue-400', purple: 'text-purple-400',
  };
  return (
    <div className={`rounded-xl border p-4 ${borders[color]}`}>
      <div className={`flex items-center gap-2 mb-2 font-display font-bold text-xs ${titles[color]}`}>{icon}{title}</div>
      <div className="text-gray-300 text-xs leading-relaxed">{children}</div>
    </div>
  );
}

// ── Status config ─────────────────────────────────────────────────────────────
function getStatusConfig(status: FuturesSignal['status']) {
  switch (status) {
    case 'ACTIVE':      return { label: 'ACTIVE',       color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', pulse: true  };
    case 'TP1_HIT':     return { label: 'TP1 HIT ✓',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', pulse: false };
    case 'TP2_HIT':     return { label: 'TP2 HIT ✓',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', pulse: false };
    case 'TP3_HIT':     return { label: 'FULL HIT ✓',  color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', pulse: false };
    case 'STOPPED_OUT': return { label: 'STOPPED OUT',  color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     pulse: false };
    case 'EXPIRED':     return { label: 'EXPIRED',      color: 'text-gray-500',    bg: 'bg-gray-500/10',    border: 'border-gray-500/20',    pulse: false };
  }
}

function SignalAge({ generatedAt }: { generatedAt: string }) {
  const minutes = Math.floor((Date.now() - new Date(generatedAt).getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const age = hours > 0 ? `${hours}h ${minutes % 60}m ago` : `${minutes}m ago`;
  const isStale = minutes > 240;
  return <span className={`font-data text-[10px] ${isStale ? 'text-orange-400' : 'text-gray-600'}`}>{isStale && '⚠ '}{age}</span>;
}

// ── Main card ─────────────────────────────────────────────────────────────────
export function SignalCard({ signal, accountBalance, riskPercent }: SignalCardProps) {
  // ← KEY CHANGE: starts collapsed (false instead of true)
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab,   setActiveTab]   = useState<'elite' | 'newbie'>('elite');
  const [copyAllDone, setCopyAllDone] = useState(false);

  const config    = FUTURES_MAP[signal.symbol];
  const statusCfg = getStatusConfig(signal.status);
  const isBuy     = signal.direction === 'BUY';
  const entryMid  = (signal.entry_zone_min + signal.entry_zone_max) / 2;
  const unit      = config?.unit || 'points';
  const n         = signal.newbie;

  const { contracts, dollarRisk, marginEstimate, dollarRiskPerContract, dollarRiskAllowed, overBudget } = calcContracts(accountBalance, riskPercent, entryMid, signal.stop_loss, signal.symbol);
  const tp1DollarReward = contracts * Math.abs(signal.tp1 - entryMid) * (config?.pointValue || 1);
  const tp2DollarReward = contracts * Math.abs(signal.tp2 - entryMid) * (config?.pointValue || 1);
  const tp3DollarReward = contracts * Math.abs(signal.tp3 - entryMid) * (config?.pointValue || 1);

  const confColor = signal.confidence >= 85 ? 'text-emerald-400' : signal.confidence >= 75 ? 'text-amber-400' : 'text-orange-400';

  const sessionColors: Record<string, string> = {
    NY:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
    LONDON: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    ASIA:   'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    OFF:    'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };

  const handleCopyAll = async () => {
    const text = [
      `SYMBOL: ${signal.symbol} (${config?.fullName || ''})`,
      `DIRECTION: ${signal.direction}`,
      `ENTRY ZONE: ${formatFuturesPrice(signal.entry_zone_min, signal.symbol)} – ${formatFuturesPrice(signal.entry_zone_max, signal.symbol)}`,
      `ENTRY MID: ${formatFuturesPrice(entryMid, signal.symbol)}`,
      `STOP LOSS: ${formatFuturesPrice(signal.stop_loss, signal.symbol)}`,
      `TP1: ${formatFuturesPrice(signal.tp1, signal.symbol)}`,
      `TP2: ${formatFuturesPrice(signal.tp2, signal.symbol)}`,
      `TP3: ${formatFuturesPrice(signal.tp3, signal.symbol)}`,
      `CONFIDENCE: ${signal.confidence}%`,
      `R:R: ${signal.risk_reward}`,
      `CONTRACTS (${riskPercent}% risk): ${contracts}`,
      `DOLLAR RISK: $${dollarRisk.toFixed(2)}`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopyAllDone(true);
    setTimeout(() => setCopyAllDone(false), 2000);
  };

  return (
    <div className={`relative bg-[#111318] border rounded-2xl overflow-hidden transition-all duration-300 signal-enter ${signal.status === 'ACTIVE' ? `${statusCfg.border} signal-active` : 'border-[#1E2128]'}`}>

      {/* Direction strip */}
      <div className={`h-0.5 w-full ${isBuy ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`} />

      {/* ── COLLAPSED PREVIEW ROW (always visible, tap to expand) ──────────── */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
      >
        {/* Symbol + full name */}
        <div className="flex flex-col items-start min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-display font-bold text-base text-white">{signal.symbol}</span>
            {signal.is_counter_trend && (
              <span className="text-[8px] bg-orange-500/15 text-orange-400 border border-orange-500/20 px-1 py-0.5 rounded font-bold">CT</span>
            )}
          </div>
          <span className="font-data text-[10px] text-gray-600 truncate max-w-[120px]">{config?.fullName}</span>
        </div>

        {/* BUY / SELL badge */}
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border flex-shrink-0 ${isBuy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
          {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {signal.direction}
        </div>

        {/* Confidence bar + % */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-12 h-1.5 bg-[#1E2128] rounded-full overflow-hidden hidden sm:block">
            <div className={`h-full rounded-full ${signal.confidence >= 85 ? 'bg-emerald-400' : signal.confidence >= 75 ? 'bg-amber-400' : 'bg-orange-400'}`}
              style={{ width: `${signal.confidence}%` }} />
          </div>
          <span className={`font-data font-bold text-sm ${confColor}`}>{signal.confidence}%</span>
        </div>

        {/* Status badge */}
        <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
          {statusCfg.pulse && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          {statusCfg.label}
        </div>

        {/* Session */}
        <div className={`hidden md:block px-2 py-0.5 rounded border text-[10px] font-data font-medium flex-shrink-0 ${sessionColors[signal.session] || sessionColors.OFF}`}>
          {signal.session}
        </div>

        {/* Age */}
        <SignalAge generatedAt={signal.generated_at} />

        {/* Chevron */}
        <div className="text-gray-600 flex-shrink-0">
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* ── EXPANDED DETAIL SECTION ────────────────────────────────────────── */}
      {showDetails && (
        <div className="px-4 pb-4 animate-fade-in border-t border-[#1E2128]">

          {/* HTF Bias */}
          {signal.higher_tf_bias && (
            <div className="mt-3 mb-3 px-3 py-2 bg-[#0A0B0D] border border-[#1E2128] rounded-xl">
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">HTF Bias · </span>
              <span className="text-xs text-gray-300">{signal.higher_tf_bias}</span>
            </div>
          )}

          {/* Counter-trend warning */}
          {signal.is_counter_trend && (
            <div className="mb-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-start gap-2">
              <AlertOctagon className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-300/80">⚠️ Counter-trend trade — goes against the HTF bias. Smaller size recommended.</p>
            </div>
          )}

          {/* Dual tabs */}
          <div className="mt-3">
            <DetailTabs active={activeTab} onChange={setActiveTab} />
          </div>

          {/* ══ ELITE TAB ════════════════════════════════════════════ */}
          {activeTab === 'elite' && (
            <div className="space-y-3">

              {/* Setup status */}
              {signal.status === 'ACTIVE' && (
                <div className={`p-3 rounded-xl border ${signal.setup_status === 'AT_ENTRY' ? 'bg-emerald-500/5 border-emerald-500/30' : signal.setup_status === 'MISSED' ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {signal.setup_status === 'AT_ENTRY' && <Zap className="w-3.5 h-3.5 text-emerald-400" />}
                    {signal.setup_status === 'MISSED'   && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                    {signal.setup_status === 'PENDING'  && <Clock className="w-3.5 h-3.5 text-yellow-400" />}
                    <span className={`text-xs font-bold ${signal.setup_status === 'AT_ENTRY' ? 'text-emerald-400' : signal.setup_status === 'MISSED' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {signal.setup_status === 'AT_ENTRY' && '🎯 PRICE IN ZONE — LOOK FOR CONFIRMATION'}
                      {signal.setup_status === 'MISSED'   && '❌ ENTRY MISSED — DO NOT CHASE'}
                      {signal.setup_status === 'PENDING'  && '⏳ PENDING — WAITING FOR RETRACEMENT'}
                    </span>
                  </div>
                  {signal.setup_status_note && <p className="text-xs text-gray-500 ml-5">{signal.setup_status_note}</p>}
                  {signal.entry_validation?.key_warning && (
                    <div className="mt-2 ml-5 text-xs text-gray-500">
                      <span className="text-amber-400 font-semibold">⚠ Watch: </span>
                      {signal.entry_validation.key_warning}
                    </div>
                  )}
                </div>
              )}

              {/* Price levels */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-3 py-2.5 bg-[#0A0B0D] rounded-xl border border-[#1E2128]">
                  <span className="text-xs text-gray-500">Entry Zone</span>
                  <div className="flex items-center">
                    <span className="font-data text-sm text-cyan-400">{formatFuturesPrice(signal.entry_zone_min, signal.symbol)} – {formatFuturesPrice(signal.entry_zone_max, signal.symbol)}</span>
                    <CopyButton value={formatFuturesPrice(entryMid, signal.symbol)} label="entry mid" />
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 bg-[#0A0B0D] rounded-xl border border-red-500/10">
                  <span className="text-xs text-gray-500">Stop Loss</span>
                  <div className="flex items-center">
                    <span className="font-data text-sm text-red-400">{formatFuturesPrice(signal.stop_loss, signal.symbol)} <span className="text-gray-600 text-xs">(-{signal.sl_points} {unit})</span></span>
                    <CopyButton value={formatFuturesPrice(signal.stop_loss, signal.symbol)} label="stop loss" />
                  </div>
                </div>
                {[
                  { label: 'TP1', sub: 'take 50%',      price: signal.tp1, pts: signal.tp1_points },
                  { label: 'TP2', sub: 'move SL to BE', price: signal.tp2, pts: signal.tp2_points },
                  { label: 'TP3', sub: 'trail stop',    price: signal.tp3, pts: signal.tp3_points },
                ].map(({ label, sub, price, pts }) => (
                  <div key={label} className="flex items-center justify-between px-3 py-2.5 bg-[#0A0B0D] rounded-xl border border-[#1E2128]">
                    <span className="text-xs text-gray-500">{label} <span className="text-[10px] text-gray-700">· {sub}</span></span>
                    <div className="flex items-center">
                      <span className="font-data text-sm text-emerald-400">{formatFuturesPrice(price, signal.symbol)} <span className="text-gray-600 text-xs">(+{pts} {unit})</span></span>
                      <CopyButton value={formatFuturesPrice(price, signal.symbol)} label={label} />
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2 bg-[#0A0B0D] rounded-xl border border-[#1E2128]">
                  <span className="text-xs text-gray-500">Risk : Reward</span>
                  <span className="font-data text-sm font-semibold text-amber-400">{signal.risk_reward}</span>
                </div>
              </div>

              {/* Position sizing */}
              <div className={`p-4 rounded-xl border ${overBudget ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/15'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-display font-semibold text-amber-400 uppercase tracking-wider">Position Sizing</span>
                  <span className="font-data text-[10px] text-gray-600 ml-auto">{riskPercent}% · ${accountBalance.toLocaleString()}</span>
                </div>
                {overBudget && (
                  <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                    <span className="text-red-400 text-base leading-none mt-0.5">⚠️</span>
                    <div>
                      <div className="text-xs font-bold text-red-400">Over Budget — 1 contract costs ${dollarRiskPerContract.toFixed(0)}</div>
                      <div className="text-[10px] text-red-400/70 mt-0.5">Your {riskPercent}% risk allows ${dollarRiskAllowed.toFixed(0)}. Consider the micro version of this contract.</div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#0A0B0D] rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-600 mb-1">Contracts</div>
                    <div className="font-data font-bold text-lg text-white flex items-center gap-1">{contracts}<CopyButton value={contracts} label="contracts" /></div>
                  </div>
                  <div className="bg-[#0A0B0D] rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-600 mb-1">Actual Risk</div>
                    <div className={`font-data font-bold text-lg flex items-center gap-1 ${overBudget ? 'text-red-400' : 'text-amber-400'}`}>${dollarRisk.toFixed(0)}<CopyButton value={dollarRisk.toFixed(2)} /></div>
                  </div>
                  <div className="bg-[#0A0B0D] rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-600 mb-1">TP1 Reward</div>
                    <div className="font-data font-bold text-base text-emerald-400">${tp1DollarReward.toFixed(0)}</div>
                  </div>
                  <div className="bg-[#0A0B0D] rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-600 mb-1">Margin Est.</div>
                    <div className="font-data font-bold text-base text-gray-400">~${marginEstimate.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-600">Risk per contract</span>
                    <span className="font-data text-gray-400">${dollarRiskPerContract.toFixed(0)}</span>
                  </div>
                  {[
                    { label: 'TP2 reward', val: tp2DollarReward },
                    { label: 'TP3 reward', val: tp3DollarReward },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between text-[11px]">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-data text-emerald-400">${val.toFixed(0)} <span className="text-gray-600">(1:{(val/dollarRisk).toFixed(1)})</span></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SMC reasoning */}
              <div className="p-3 bg-[#0A0B0D] border border-[#1E2128] rounded-xl">
                <div className="text-[10px] text-amber-500/70 uppercase tracking-wider mb-2 font-display">SMC Analysis</div>
                <div className="space-y-1.5">
                  {signal.reasoning.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                      <CheckCircle2 className="w-3 h-3 text-amber-500/60 flex-shrink-0 mt-0.5" />{r}
                    </div>
                  ))}
                </div>
              </div>

              {/* Copy all */}
              <button onClick={handleCopyAll}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${copyAllDone ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-[#0A0B0D] border-[#1E2128] hover:border-amber-500/30 text-gray-500 hover:text-amber-400'}`}>
                {copyAllDone ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copyAllDone ? 'Copied to clipboard!' : 'Copy Full Setup'}
              </button>
            </div>
          )}

          {/* ══ NEWBIE TAB ═══════════════════════════════════════════ */}
          {activeTab === 'newbie' && (
            <div className="space-y-3">
              {!n ? (
                <div className="p-4 bg-[#0A0B0D] border border-[#1E2128] rounded-xl text-center text-gray-600 text-xs">
                  Newbie explanation not available for this signal.
                </div>
              ) : (
                <>
                  <NCard icon={<HelpCircle className="w-3.5 h-3.5" />} title="📊 What Is Happening?" color="amber">
                    {n.what_is_happening}
                  </NCard>

                  <NCard
                    icon={isBuy ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    title={isBuy ? "📈 We Want to BUY — What That Means" : "📉 We Want to SELL — What That Means"}
                    color={isBuy ? 'green' : 'red'}
                  >
                    {n.direction_explained}
                  </NCard>

                  <NCard icon={<BarChart3 className="w-3.5 h-3.5" />} title="🌍 The Big Picture" color="blue">
                    {n.big_picture}
                    {signal.is_counter_trend && (
                      <div className="mt-2 p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-300 text-xs">
                        ⚠️ <strong>Heads up:</strong> This goes AGAINST the main trend. Riskier trade — use smaller size.
                      </div>
                    )}
                  </NCard>

                  <NCard icon={<Target className="w-3.5 h-3.5" />} title="🎯 Where to Enter" color="cyan">
                    <p className="mb-2">{n.entry_explained}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2.5 text-center">
                        <div className="text-[9px] text-cyan-400/70 mb-1">ZONE LOW</div>
                        <div className="font-data font-bold text-cyan-400">{formatFuturesPrice(signal.entry_zone_min, signal.symbol)}</div>
                      </div>
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2.5 text-center">
                        <div className="text-[9px] text-cyan-400/70 mb-1">ZONE HIGH</div>
                        <div className="font-data font-bold text-cyan-400">{formatFuturesPrice(signal.entry_zone_max, signal.symbol)}</div>
                      </div>
                    </div>
                  </NCard>

                  <NCard icon={<CheckCircle2 className="w-3.5 h-3.5" />} title="✅ When to Pull the Trigger" color="green">
                    {n.confirmation_explained}
                  </NCard>

                  <NCard icon={<Shield className="w-3.5 h-3.5" />} title="🛡️ Your Safety Net (Stop Loss)" color="red">
                    <p className="mb-2">{n.stop_loss_explained}</p>
                    <div className="flex items-center justify-between p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <span className="text-[10px] text-red-400/70">Set Stop Loss At:</span>
                      <span className="font-data font-bold text-red-400">{formatFuturesPrice(signal.stop_loss, signal.symbol)}</span>
                    </div>
                  </NCard>

                  <NCard icon={<DollarSign className="w-3.5 h-3.5" />} title="💰 Where to Take Profits" color="green">
                    <p className="mb-2">{n.targets_explained}</p>
                    <div className="space-y-1.5">
                      {[
                        { label: 'TP1 — Take 50% profit', price: signal.tp1, desc: 'Close half. Lock in gains.' },
                        { label: 'TP2 — Move SL to entry', price: signal.tp2, desc: "Free trade! Can't lose now." },
                        { label: 'TP3 — Trail & ride',     price: signal.tp3, desc: 'Maximum profit zone.' },
                      ].map(({ label, price, desc }) => (
                        <div key={label} className="flex items-center justify-between px-2.5 py-2 bg-emerald-500/5 border border-emerald-500/15 rounded-lg">
                          <div>
                            <div className="text-[10px] text-emerald-400 font-semibold">{label}</div>
                            <div className="text-[9px] text-gray-600">{desc}</div>
                          </div>
                          <span className="font-data font-bold text-emerald-400 text-sm">{formatFuturesPrice(price, signal.symbol)}</span>
                        </div>
                      ))}
                    </div>
                  </NCard>

                  <NCard icon={<BookOpen className="w-3.5 h-3.5" />} title="🧠 Why the AI Spotted This" color="purple">
                    <div className="space-y-2">
                      {n.smc_elements_plain.map((el, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <ArrowRight className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
                          <span>{el}</span>
                        </div>
                      ))}
                    </div>
                  </NCard>

                  <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-display font-bold text-xs text-cyan-400">🪜 Your Step-By-Step Plan</span>
                    </div>
                    <div className="space-y-0">
                      {n.what_to_do_step_by_step.map((step, i) => (
                        <div key={i} className="flex items-start gap-2.5 py-2 border-b border-[#1E2128] last:border-0">
                          <div className="w-5 h-5 flex-shrink-0 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mt-0.5">
                            <span className="font-data font-bold text-[9px] text-cyan-400">{i + 1}</span>
                          </div>
                          <span className="text-xs text-gray-300 leading-relaxed pt-0.5">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <NCard icon={<Star className="w-3.5 h-3.5" />} title="📊 What the Confidence Score Means" color="amber">
                    <p className="mb-2">{n.confidence_plain}</p>
                    <div className="w-full h-2 bg-[#1E2128] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${signal.confidence >= 85 ? 'bg-emerald-400' : signal.confidence >= 75 ? 'bg-amber-400' : 'bg-orange-400'}`}
                        style={{ width: `${signal.confidence}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-gray-700">Weak</span>
                      <span className={`text-xs font-bold ${confColor}`}>{signal.confidence}%</span>
                      <span className="text-[9px] text-gray-700">Strong</span>
                    </div>
                  </NCard>

                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-display font-bold text-xs text-amber-400">⚠️ Reality Check</span>
                    </div>
                    <p className="text-xs text-gray-300 ml-5">{n.risk_reality_check}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
