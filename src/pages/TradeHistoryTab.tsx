import { useState, useEffect, useCallback } from 'react';
import {
  History, TrendingUp, TrendingDown, CheckCircle2, XCircle,
  Clock, ChevronDown, ChevronUp, BarChart3, Target, Zap,
  Calendar, Filter, RefreshCw, BookOpen, AlertTriangle
} from 'lucide-react';
import { useTier } from '../contexts/TierContext';
import { Lock } from 'lucide-react';
import { supabase, DataAnalysis } from '../lib/supabase';
import { formatFuturesPrice, FUTURES_MAP } from '../lib/futuresSymbols';

// ── Outcome config ─────────────────────────────────────────────────────────────
const OUTCOMES = [
  { value: 'PENDING',     label: 'Pending',     color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20' },
  { value: 'TP1_HIT',     label: 'TP1 Hit ✓',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { value: 'TP2_HIT',     label: 'TP2 Hit ✓',   color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  { value: 'TP3_HIT',     label: 'Full TP3 ✓',  color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' },
  { value: 'STOPPED_OUT', label: 'Stopped Out', color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
  { value: 'SKIPPED',     label: 'Skipped',     color: 'text-gray-500',    bg: 'bg-gray-500/10',    border: 'border-gray-500/20' },
];

function outcomeConfig(outcome: string) {
  return OUTCOMES.find(o => o.value === outcome) || OUTCOMES[0];
}

// ── Stats card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'text-white' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-[#0A0B0D] rounded-xl p-4 border border-[#1E2128]">
      <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-data font-bold text-2xl ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Outcome selector ───────────────────────────────────────────────────────────
function OutcomeSelector({ analysisId, current, onUpdate }: { analysisId: string; current: string; onUpdate: (id: string, outcome: string) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const cfg = outcomeConfig(current);

  const select = async (value: string) => {
    setSaving(true); setOpen(false);
    await supabase.from('data_analyses').update({
      outcome: value,
      outcome_updated_at: new Date().toISOString(),
    }).eq('id', analysisId);
    onUpdate(analysisId, value);
    setSaving(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${cfg.bg} ${cfg.color} ${cfg.border}`}>
        {saving ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : null}
        {cfg.label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-[#111318] border border-[#1E2128] rounded-xl shadow-2xl overflow-hidden min-w-[140px]">
          {OUTCOMES.map(o => (
            <button key={o.value} onMouseDown={() => select(o.value)}
              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-white/5 ${o.color} ${o.value === current ? 'bg-white/3' : ''}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Analysis card ──────────────────────────────────────────────────────────────
function AnalysisCard({ analysis, onOutcomeUpdate, onJournalCreate }: {
  analysis: DataAnalysis;
  onOutcomeUpdate: (id: string, outcome: string) => void;
  onJournalCreate: (analysis: DataAnalysis) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isBuy   = analysis.direction === 'BUY';
  const config  = analysis.symbol ? FUTURES_MAP[analysis.symbol] : null;
  const unit    = config?.unit || 'points';
  const cfg     = outcomeConfig(analysis.outcome);
  const date    = new Date(analysis.created_at);

  return (
    <div className={`bg-[#111318] border rounded-2xl overflow-hidden transition-all ${
      analysis.outcome === 'TP3_HIT' ? 'border-emerald-500/30' :
      analysis.outcome === 'STOPPED_OUT' ? 'border-red-500/20' :
      analysis.outcome === 'PENDING' ? 'border-[#1E2128]' : 'border-[#1E2128]'
    }`}>
      {/* Direction strip */}
      <div className={`h-0.5 w-full ${isBuy ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: symbol info */}
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border ${isBuy ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              {isBuy ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-display font-bold text-white">{analysis.symbol}</span>
                <span className="font-data text-xs text-gray-600">{analysis.timeframe}</span>
                {analysis.is_counter_trend && (
                  <span className="text-[9px] bg-orange-500/15 text-orange-400 border border-orange-500/20 px-1.5 rounded font-bold">CT</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-data text-xs font-bold ${analysis.confidence && analysis.confidence >= 85 ? 'text-emerald-400' : analysis.confidence && analysis.confidence >= 75 ? 'text-amber-400' : 'text-orange-400'}`}>
                  {analysis.confidence}%
                </span>
                <span className="text-gray-700 text-xs">·</span>
                <span className="font-data text-xs text-gray-500">{analysis.risk_reward}</span>
                <span className="text-gray-700 text-xs">·</span>
                <span className="font-data text-[10px] text-gray-600">{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          {/* Right: outcome selector */}
          <OutcomeSelector analysisId={analysis.id} current={analysis.outcome} onUpdate={onOutcomeUpdate} />
        </div>

        {/* Key prices row */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="bg-[#0A0B0D] rounded-lg p-2 text-center">
            <div className="text-[9px] text-gray-600 mb-0.5">ENTRY</div>
            <div className="font-data text-xs text-cyan-400">
              {analysis.entry_zone_min && analysis.entry_zone_max
                ? `${formatFuturesPrice(analysis.entry_zone_min, analysis.symbol)}–${formatFuturesPrice(analysis.entry_zone_max, analysis.symbol)}`
                : '—'}
            </div>
          </div>
          <div className="bg-[#0A0B0D] rounded-lg p-2 text-center">
            <div className="text-[9px] text-gray-600 mb-0.5">SL</div>
            <div className="font-data text-xs text-red-400">
              {analysis.stop_loss ? formatFuturesPrice(analysis.stop_loss, analysis.symbol) : '—'}
            </div>
          </div>
          <div className="bg-[#0A0B0D] rounded-lg p-2 text-center">
            <div className="text-[9px] text-gray-600 mb-0.5">TP1</div>
            <div className="font-data text-xs text-emerald-400">
              {analysis.tp1 ? formatFuturesPrice(analysis.tp1, analysis.symbol) : '—'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0A0B0D] border border-[#1E2128] rounded-lg text-xs text-gray-500 hover:text-gray-300 transition-all">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Details
          </button>
          <button onClick={() => isElite ? onJournalCreate(analysis) : triggerUpgrade("Trading Journal")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-400 hover:bg-cyan-500/15 transition-all">
            <BookOpen className="w-3 h-3" />
            Journal
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[#1E2128] space-y-2">
            {/* HTF bias */}
            {analysis.higher_tf_bias && (
              <div className="px-3 py-2 bg-[#0A0B0D] rounded-xl border border-[#1E2128]">
                <span className="text-[10px] text-gray-600 uppercase tracking-wider">HTF Bias · </span>
                <span className="text-xs text-gray-300">{analysis.higher_tf_bias}</span>
              </div>
            )}
            {/* All TPs */}
            <div className="space-y-1">
              {[
                { label: 'TP2', price: analysis.tp2, pts: analysis.tp2_points },
                { label: 'TP3', price: analysis.tp3, pts: analysis.tp3_points },
              ].map(({ label, price, pts }) => price ? (
                <div key={label} className="flex justify-between text-xs px-1">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-data text-emerald-400">{formatFuturesPrice(price, analysis.symbol)} <span className="text-gray-600">(+{pts} {unit})</span></span>
                </div>
              ) : null)}
            </div>
            {/* Reasoning */}
            {analysis.reasoning && analysis.reasoning.length > 0 && (
              <div className="p-3 bg-[#0A0B0D] border border-[#1E2128] rounded-xl">
                <div className="text-[10px] text-amber-500/70 uppercase tracking-wider mb-2">SMC Reasoning</div>
                <div className="space-y-1">
                  {analysis.reasoning.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                      <CheckCircle2 className="w-3 h-3 text-amber-500/50 flex-shrink-0 mt-0.5" />{r}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Outcome notes */}
            {analysis.outcome_notes && (
              <div className="px-3 py-2 bg-[#0A0B0D] rounded-xl border border-[#1E2128]">
                <div className="text-[10px] text-gray-600 mb-1">Your Notes</div>
                <p className="text-xs text-gray-300">{analysis.outcome_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function TradeHistoryTab({ onJournalCreate }: { onJournalCreate?: (analysis: DataAnalysis) => void }) {
  const [analyses,   setAnalyses]   = useState<DataAnalysis[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState<string>('ALL');
  const [dirFilter,  setDirFilter]  = useState<string>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    const { data, error } = await supabase
      .from('data_analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setAnalyses(data as DataAnalysis[]);
    setLoading(false);
    if (showRefresh) setRefreshing(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleOutcomeUpdate = (id: string, outcome: string) => {
    setAnalyses(prev => prev.map(a => a.id === id ? { ...a, outcome: outcome as any } : a));
  };

  // Stats
  const total    = analyses.length;
  const decided  = analyses.filter(a => !['PENDING','SKIPPED'].includes(a.outcome));
  const wins     = analyses.filter(a => ['TP1_HIT','TP2_HIT','TP3_HIT'].includes(a.outcome));
  const winRate  = decided.length > 0 ? Math.round((wins.length / decided.length) * 100) : 0;
  const fullTPs  = analyses.filter(a => a.outcome === 'TP3_HIT').length;
  const stopped  = analyses.filter(a => a.outcome === 'STOPPED_OUT').length;
  const buys     = analyses.filter(a => a.direction === 'BUY').length;
  const sells    = analyses.filter(a => a.direction === 'SELL').length;

  // Filters
  const filtered = analyses.filter(a => {
    if (filter !== 'ALL' && a.outcome !== filter) return false;
    if (dirFilter !== 'ALL' && a.direction !== dirFilter) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

        {/* ── Left panel ──────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Stats */}
          <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span className="font-display font-bold text-sm text-white">Your Stats</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Total Analyses" value={total} />
              <StatCard label="Win Rate" value={`${winRate}%`} sub={`${decided.length} decided`}
                color={winRate >= 60 ? 'text-emerald-400' : winRate >= 40 ? 'text-amber-400' : 'text-red-400'} />
              <StatCard label="Full TP3 Hits" value={fullTPs} color="text-emerald-400" />
              <StatCard label="Stopped Out" value={stopped} color="text-red-400" />
              <StatCard label="BUY setups" value={buys} color="text-emerald-400" />
              <StatCard label="SELL setups" value={sells} color="text-red-400" />
            </div>
          </div>

          {/* Filters */}
          <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-display text-xs font-semibold text-gray-400 uppercase tracking-wider">Filter</span>
            </div>

            {/* Direction */}
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 block">Direction</label>
              <div className="flex gap-1.5">
                {['ALL','BUY','SELL'].map(d => (
                  <button key={d} onClick={() => setDirFilter(d)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      dirFilter === d
                        ? d === 'BUY' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : d === 'SELL' ? 'bg-red-500/15 border-red-500/30 text-red-400'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-[#0A0B0D] border-[#1E2128] text-gray-600 hover:text-gray-300'
                    }`}>{d}</button>
                ))}
              </div>
            </div>

            {/* Outcome */}
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 block">Outcome</label>
              <div className="space-y-1">
                {['ALL', ...OUTCOMES.map(o => o.value)].map(o => (
                  <button key={o} onClick={() => setFilter(o)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      filter === o
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-[#0A0B0D] border-[#1E2128] text-gray-600 hover:text-gray-300'
                    }`}>
                    {o === 'ALL' ? 'All Outcomes' : outcomeConfig(o).label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={() => fetch(true)} disabled={refreshing}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#111318] border border-[#1E2128] hover:border-amber-500/20 text-gray-500 hover:text-amber-400 rounded-xl text-sm transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* ── Right panel ─────────────────────────────────────────── */}
        <div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-32 bg-[#111318] border border-[#1E2128] rounded-2xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-[#111318] border border-[#1E2128] rounded-2xl flex items-center justify-center mb-4">
                <History className="w-7 h-7 text-gray-700" />
              </div>
              <h3 className="font-display font-semibold text-white mb-2">No analyses yet</h3>
              <p className="text-gray-600 text-sm max-w-xs">
                {filter !== 'ALL' || dirFilter !== 'ALL'
                  ? 'No results match your filters.'
                  : 'Run your first analysis on the Data Analysis tab — it will appear here automatically.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-xs text-gray-600">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
                <span className="text-[10px] text-gray-700">Tap outcome badge to update</span>
              </div>
              {filtered.map(analysis => (
                <AnalysisCard
                  key={analysis.id}
                  analysis={analysis}
                  onOutcomeUpdate={handleOutcomeUpdate}
                  onJournalCreate={onJournalCreate || (() => {})}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
