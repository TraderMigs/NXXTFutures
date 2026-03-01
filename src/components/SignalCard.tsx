import { useState } from 'react';
import {
  TrendingUp, TrendingDown, CheckCircle2, XCircle, Clock,
  Copy, Check, AlertTriangle, Zap, BarChart3, ChevronDown, ChevronUp,
  DollarSign, Target
} from 'lucide-react';
import { FuturesSignal } from '../lib/supabase';
import { FUTURES_MAP, formatFuturesPrice, calcContracts } from '../lib/futuresSymbols';

interface SignalCardProps {
  signal: FuturesSignal;
  accountBalance: number;
  riskPercent: number;
}

// ── Copy button with flash feedback ──────────────────────────────────────────
function CopyButton({ value, label }: { value: string | number; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label || value}`}
      className={`ml-1.5 p-1 rounded transition-all duration-150 ${
        copied
          ? 'bg-amber-500/20 text-amber-400'
          : 'text-gray-700 hover:text-gray-400 hover:bg-white/10'
      }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ── Status config ─────────────────────────────────────────────────────────────
function getStatusConfig(status: FuturesSignal['status']) {
  switch (status) {
    case 'ACTIVE':
      return { label: 'ACTIVE', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', pulse: true };
    case 'TP1_HIT':
      return { label: 'TP1 HIT ✓', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', pulse: false };
    case 'TP2_HIT':
      return { label: 'TP2 HIT ✓', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', pulse: false };
    case 'TP3_HIT':
      return { label: 'FULL HIT ✓', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', pulse: false };
    case 'STOPPED_OUT':
      return { label: 'STOPPED OUT', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', pulse: false };
    case 'EXPIRED':
      return { label: 'EXPIRED', color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20', pulse: false };
  }
}

// ── Risk level color ──────────────────────────────────────────────────────────
function getRiskColor(level: FuturesSignal['status']) {
  return 'text-amber-400'; // placeholder — expand per signal riskLevel
}

// ── Signal age ────────────────────────────────────────────────────────────────
function SignalAge({ generatedAt }: { generatedAt: string }) {
  const minutes = Math.floor((Date.now() - new Date(generatedAt).getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const age = hours > 0 ? `${hours}h ${minutes % 60}m ago` : `${minutes}m ago`;
  const isStale = minutes > 240; // 4 hours

  return (
    <span className={`font-data text-[10px] ${isStale ? 'text-orange-400' : 'text-gray-600'}`}>
      {isStale && '⚠ '}{age}
    </span>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────
export function SignalCard({ signal, accountBalance, riskPercent }: SignalCardProps) {
  const [showDetails, setShowDetails] = useState(true);
  const [copyAllDone, setCopyAllDone] = useState(false);

  const config = FUTURES_MAP[signal.symbol];
  const statusCfg = getStatusConfig(signal.status);
  const isBuy = signal.direction === 'BUY';
  const entryMid = (signal.entry_zone_min + signal.entry_zone_max) / 2;
  const unit = config?.unit || 'points';

  // Position sizing calc
  const { contracts, dollarRisk, marginEstimate } = calcContracts(
    accountBalance, riskPercent, entryMid, signal.stop_loss, signal.symbol
  );

  const tp1DollarReward = contracts * Math.abs(signal.tp1 - entryMid) * (config?.pointValue || 1);
  const tp2DollarReward = contracts * Math.abs(signal.tp2 - entryMid) * (config?.pointValue || 1);
  const tp3DollarReward = contracts * Math.abs(signal.tp3 - entryMid) * (config?.pointValue || 1);

  // Confidence color
  const confColor = signal.confidence >= 85
    ? 'text-emerald-400' : signal.confidence >= 75
    ? 'text-amber-400' : 'text-orange-400';

  // Session badge
  const sessionColors: Record<string, string> = {
    NY: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    LONDON: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    ASIA: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    OFF: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };

  // Copy All handler
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
    <div className={`relative bg-[#111318] border rounded-2xl overflow-hidden transition-all duration-300 signal-enter ${
      signal.status === 'ACTIVE' ? `${statusCfg.border} signal-active` : `border-[#1E2128]`
    }`}>

      {/* Top strip — direction color bar */}
      <div className={`h-0.5 w-full ${isBuy ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`} />

      <div className="p-5">
        {/* ── Row 1: Symbol + badges ─────────────────────────────────── */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display font-bold text-xl text-white">{signal.symbol}</span>
              <span className="font-data text-xs text-gray-500">{config?.exchange}</span>
              <span className="font-data text-xs text-gray-600">·</span>
              <span className="font-data text-xs text-gray-500">{signal.timeframe}</span>
            </div>
            <div className="font-data text-xs text-gray-600">{config?.fullName}</div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* Direction badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
              isBuy
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}>
              {isBuy ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {signal.direction}
            </div>
            {/* Status badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
              {statusCfg.pulse && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              {statusCfg.label}
            </div>
          </div>
        </div>

        {/* ── Row 2: Confidence + Session + Age ──────────────────────── */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {/* Confidence gauge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Confidence</span>
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-1.5 bg-[#1E2128] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full gauge-fill ${
                    signal.confidence >= 85 ? 'bg-emerald-400' :
                    signal.confidence >= 75 ? 'bg-amber-400' : 'bg-orange-400'
                  }`}
                  style={{ '--gauge-width': `${signal.confidence}%` } as React.CSSProperties}
                />
              </div>
              <span className={`font-data font-bold text-sm ${confColor}`}>{signal.confidence}%</span>
            </div>
          </div>

          {/* Session */}
          <div className={`px-2 py-0.5 rounded border text-[10px] font-data font-medium ${sessionColors[signal.session] || sessionColors.OFF}`}>
            {signal.session}
          </div>

          {/* ATR */}
          {signal.atr_value && (
            <div className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3 text-gray-600" />
              <span className="font-data text-[10px] text-gray-600">ATR: {signal.atr_value.toFixed(2)}</span>
            </div>
          )}

          {/* News warning */}
          {signal.news_warning && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-[10px] text-orange-400">
              <AlertTriangle className="w-3 h-3" />
              NEWS
            </div>
          )}

          {/* Age */}
          <SignalAge generatedAt={signal.generated_at} />
        </div>

        {/* ── HTF Bias ────────────────────────────────────────────────── */}
        {signal.higher_tf_bias && (
          <div className="mb-4 px-3 py-2 bg-[#0A0B0D] border border-[#1E2128] rounded-xl">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">HTF Bias · </span>
            <span className="text-xs text-gray-300">{signal.higher_tf_bias}</span>
          </div>
        )}

        {/* ── Toggle details ──────────────────────────────────────────── */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between px-3 py-2 bg-[#0A0B0D] hover:bg-white/3 border border-[#1E2128] rounded-xl text-xs text-gray-500 hover:text-gray-300 transition-all mb-4"
        >
          <span>Trade Levels & Position Size</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showDetails && (
          <div className="space-y-3 animate-fade-in">
            {/* ── Price levels ────────────────────────────────────────── */}
            <div className="space-y-1.5">
              {/* Entry Zone */}
              <div className="flex items-center justify-between px-3 py-2.5 bg-[#0A0B0D] rounded-xl border border-[#1E2128]">
                <span className="text-xs text-gray-500">Entry Zone</span>
                <div className="flex items-center">
                  <span className="font-data text-sm text-cyan-400">
                    {formatFuturesPrice(signal.entry_zone_min, signal.symbol)} – {formatFuturesPrice(signal.entry_zone_max, signal.symbol)}
                  </span>
                  <CopyButton value={formatFuturesPrice(entryMid, signal.symbol)} label="entry mid" />
                </div>
              </div>

              {/* Stop Loss */}
              <div className="flex items-center justify-between px-3 py-2.5 bg-[#0A0B0D] rounded-xl border border-red-500/10">
                <span className="text-xs text-gray-500">Stop Loss</span>
                <div className="flex items-center">
                  <span className="font-data text-sm text-red-400">
                    {formatFuturesPrice(signal.stop_loss, signal.symbol)}
                    <span className="text-gray-600 text-xs ml-1.5">(-{signal.sl_points} {unit})</span>
                  </span>
                  <CopyButton value={formatFuturesPrice(signal.stop_loss, signal.symbol)} label="stop loss" />
                </div>
              </div>

              {/* TP1 */}
              <div className="flex items-center justify-between px-3 py-2.5 bg-[#0A0B0D] rounded-xl border border-[#1E2128]">
                <span className="text-xs text-gray-500">TP1 <span className="text-[10px] text-gray-700">· take 50%</span></span>
                <div className="flex items-center">
                  <span className="font-data text-sm text-emerald-400">
                    {formatFuturesPrice(signal.tp1, signal.symbol)}
                    <span className="text-gray-600 text-xs ml-1.5">(+{signal.tp1_points} {unit})</span>
                  </span>
                  <CopyButton value={formatFuturesPrice(signal.tp1, signal.symbol)} label="TP1" />
                </div>
              </div>

              {/* TP2 */}
              <div className="flex items-center justify-between px-3 py-2.5 bg-[#0A0B0D] rounded-xl border border-[#1E2128]">
                <span className="text-xs text-gray-500">TP2 <span className="text-[10px] text-gray-700">· move SL to BE</span></span>
                <div className="flex items-center">
                  <span className="font-data text-sm text-emerald-400">
                    {formatFuturesPrice(signal.tp2, signal.symbol)}
                    <span className="text-gray-600 text-xs ml-1.5">(+{signal.tp2_points} {unit})</span>
                  </span>
                  <CopyButton value={formatFuturesPrice(signal.tp2, signal.symbol)} label="TP2" />
                </div>
              </div>

              {/* TP3 */}
              <div className="flex items-center justify-between px-3 py-2.5 bg-[#0A0B0D] rounded-xl border border-[#1E2128]">
                <span className="text-xs text-gray-500">TP3 <span className="text-[10px] text-gray-700">· trail stop</span></span>
                <div className="flex items-center">
                  <span className="font-data text-sm text-emerald-400">
                    {formatFuturesPrice(signal.tp3, signal.symbol)}
                    <span className="text-gray-600 text-xs ml-1.5">(+{signal.tp3_points} {unit})</span>
                  </span>
                  <CopyButton value={formatFuturesPrice(signal.tp3, signal.symbol)} label="TP3" />
                </div>
              </div>

              {/* R:R */}
              <div className="flex items-center justify-between px-3 py-2 bg-[#0A0B0D] rounded-xl border border-[#1E2128]">
                <span className="text-xs text-gray-500">Risk : Reward</span>
                <span className="font-data text-sm font-semibold text-amber-400">{signal.risk_reward}</span>
              </div>
            </div>

            {/* ── Position Size Calculator ─────────────────────────────── */}
            <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-display font-semibold text-amber-400 uppercase tracking-wider">Position Sizing</span>
                <span className="font-data text-[10px] text-gray-600">({riskPercent}% risk · ${accountBalance.toLocaleString()})</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0A0B0D] rounded-lg p-2.5">
                  <div className="text-[10px] text-gray-600 mb-1">Contracts</div>
                  <div className="font-data font-bold text-lg text-white flex items-center gap-1">
                    {contracts}
                    <CopyButton value={contracts} label="contracts" />
                  </div>
                </div>
                <div className="bg-[#0A0B0D] rounded-lg p-2.5">
                  <div className="text-[10px] text-gray-600 mb-1">Dollar Risk</div>
                  <div className="font-data font-bold text-lg text-red-400 flex items-center gap-1">
                    ${dollarRisk.toFixed(0)}
                    <CopyButton value={dollarRisk.toFixed(2)} label="dollar risk" />
                  </div>
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
              {/* Full TP breakdown */}
              <div className="mt-2 space-y-1">
                {[
                  { label: 'TP2 reward', val: tp2DollarReward, rr: `1:${(tp2DollarReward/dollarRisk).toFixed(1)}` },
                  { label: 'TP3 reward', val: tp3DollarReward, rr: `1:${(tp3DollarReward/dollarRisk).toFixed(1)}` },
                ].map(({ label, val, rr }) => (
                  <div key={label} className="flex justify-between text-[11px]">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-data text-emerald-400">${val.toFixed(0)} <span className="text-gray-600">({rr})</span></span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Setup status strip ───────────────────────────────────── */}
            {signal.status === 'ACTIVE' && (
              <div className={`p-3 rounded-xl border ${
                signal.setup_status === 'AT_ENTRY'
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : signal.setup_status === 'MISSED'
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-yellow-500/5 border-yellow-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {signal.setup_status === 'AT_ENTRY' && <Zap className="w-3.5 h-3.5 text-emerald-400" />}
                  {signal.setup_status === 'MISSED' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  {signal.setup_status === 'PENDING' && <Clock className="w-3.5 h-3.5 text-yellow-400" />}
                  <span className={`text-xs font-bold ${
                    signal.setup_status === 'AT_ENTRY' ? 'text-emerald-400' :
                    signal.setup_status === 'MISSED' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {signal.setup_status === 'AT_ENTRY' && '🎯 PRICE IN ZONE — LOOK FOR CONFIRMATION'}
                    {signal.setup_status === 'MISSED' && '❌ ENTRY MISSED — DO NOT CHASE'}
                    {signal.setup_status === 'PENDING' && '⏳ PENDING — WAITING FOR RETRACEMENT'}
                  </span>
                </div>
                {signal.setup_status_note && (
                  <p className="text-xs text-gray-500 ml-5">{signal.setup_status_note}</p>
                )}
                {signal.entry_validation?.key_warning && (
                  <div className="mt-2 ml-5 text-xs text-gray-500">
                    <span className="text-amber-400 font-semibold">⚠ Watch: </span>
                    {signal.entry_validation.key_warning}
                  </div>
                )}
              </div>
            )}

            {/* ── Reasoning ───────────────────────────────────────────── */}
            <div className="p-3 bg-[#0A0B0D] border border-[#1E2128] rounded-xl">
              <div className="text-[10px] text-amber-500/70 uppercase tracking-wider mb-2 font-display">SMC Analysis</div>
              <div className="space-y-1.5">
                {signal.reasoning.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                    <CheckCircle2 className="w-3 h-3 text-amber-500/60 flex-shrink-0 mt-0.5" />
                    {r}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Copy All ────────────────────────────────────────────── */}
            <button
              onClick={handleCopyAll}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                copyAllDone
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-[#0A0B0D] border-[#1E2128] hover:border-amber-500/30 text-gray-500 hover:text-amber-400'
              }`}
            >
              {copyAllDone ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copyAllDone ? 'Copied to clipboard!' : 'Copy Full Setup'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
