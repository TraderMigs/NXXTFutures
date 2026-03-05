import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Plus, TrendingUp, TrendingDown, Brain, CheckCircle2,
  Clock, XCircle, Zap, ChevronDown, ChevronUp, RefreshCw,
  Smile, AlertTriangle, Target, BarChart3, Pencil, Trash2, Loader2
} from 'lucide-react';
import { useTier } from '../contexts/TierContext';
import { Lock } from 'lucide-react';
import { supabase, JournalEntry, DataAnalysis } from '../lib/supabase';

// ── Emotion config ─────────────────────────────────────────────────────────────
const EMOTIONS = [
  { value: 'DISCIPLINED', label: '🧘 Disciplined',  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { value: 'CONFIDENT',   label: '💪 Confident',    color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  { value: 'NEUTRAL',     label: '😐 Neutral',      color: 'text-gray-400',    bg: 'bg-gray-500/10',    border: 'border-gray-500/20'    },
  { value: 'FOMO',        label: '😰 FOMO',         color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20'  },
  { value: 'FEARFUL',     label: '😨 Fearful',      color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20'  },
  { value: 'GREEDY',      label: '🤑 Greedy',       color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
];

const OUTCOMES = [
  { value: 'PENDING',     label: '⏳ Pending',      color: 'text-yellow-400' },
  { value: 'TP1_HIT',     label: '✅ TP1 Hit',      color: 'text-emerald-400' },
  { value: 'TP2_HIT',     label: '✅ TP2 Hit',      color: 'text-emerald-400' },
  { value: 'TP3_HIT',     label: '🏆 Full TP3',     color: 'text-emerald-400' },
  { value: 'STOPPED_OUT', label: '❌ Stopped Out',  color: 'text-red-400'     },
  { value: 'SKIPPED',     label: '⏭️ Skipped',      color: 'text-gray-400'    },
  { value: 'MISSED',      label: '💨 Missed',       color: 'text-gray-500'    },
];

function emotionCfg(v: string) { return EMOTIONS.find(e => e.value === v) || EMOTIONS[2]; }
function outcomeCfg(v: string) { return OUTCOMES.find(o => o.value === v) || OUTCOMES[0]; }

// ── Journal entry form ─────────────────────────────────────────────────────────
function EntryForm({
  prefill,
  onSave,
  onCancel,
}: {
  prefill?: Partial<JournalEntry> & { analysis?: DataAnalysis };
  onSave: (entry: JournalEntry) => void;
  onCancel: () => void;
}) {
  const [symbol,         setSymbol]         = useState(prefill?.symbol || '');
  const [timeframe,      setTimeframe]      = useState(prefill?.timeframe || '1h');
  const [direction,      setDirection]      = useState(prefill?.direction || 'BUY');
  const [emotionalState, setEmotionalState] = useState(prefill?.emotional_state || 'NEUTRAL');
  const [preTradePlan,   setPreTradePlan]   = useState(prefill?.pre_trade_plan || '');
  const [followedPlan,   setFollowedPlan]   = useState<boolean | null>(prefill?.followed_plan ?? null);
  const [entryNotes,     setEntryNotes]     = useState(prefill?.entry_notes || '');
  const [outcome,        setOutcome]        = useState(prefill?.outcome || 'PENDING');
  const [pnlPoints,      setPnlPoints]      = useState<string>(prefill?.pnl_points?.toString() || '');
  const [pnlDollars,     setPnlDollars]     = useState<string>(prefill?.pnl_dollars?.toString() || '');
  const [postNotes,      setPostNotes]      = useState(prefill?.post_trade_notes || '');
  const [lessons,        setLessons]        = useState(prefill?.lessons_learned || '');
  const [saving,         setSaving]         = useState(false);

  const label = (t: string, req = false) => (
    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
      {t}{req && <span className="text-amber-400 ml-0.5">*</span>}
    </label>
  );

  const input = (value: string, onChange: (v: string) => void, placeholder = '') => (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-[#0A0B0D] border border-[#1E2128] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-amber-500/30 transition-all" />
  );

  const textarea = (value: string, onChange: (v: string) => void, placeholder = '', rows = 3) => (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full bg-[#0A0B0D] border border-[#1E2128] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-amber-500/30 transition-all resize-none" />
  );

  const handleSave = async () => {
    if (!symbol.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const payload: any = {
      user_id:        user.id,
      analysis_id:    prefill?.analysis_id || null,
      symbol:         symbol.toUpperCase().trim(),
      timeframe,
      direction,
      emotional_state: emotionalState,
      pre_trade_plan:  preTradePlan || null,
      followed_plan:   followedPlan,
      entry_notes:     entryNotes || null,
      outcome,
      pnl_points:      pnlPoints ? parseFloat(pnlPoints) : null,
      pnl_dollars:     pnlDollars ? parseFloat(pnlDollars) : null,
      post_trade_notes: postNotes || null,
      lessons_learned:  lessons || null,
      trade_date:      new Date().toISOString().split('T')[0],
    };

    const { data, error } = await supabase
      .from('journal_entries')
      .insert(payload)
      .select()
      .single();

    if (!error && data) onSave(data as JournalEntry);
    setSaving(false);
  };

  return (
    <div className="bg-[#111318] border border-amber-500/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-4 h-4 text-amber-400" />
        <span className="font-display font-bold text-sm text-white">New Journal Entry</span>
      </div>

      {/* Symbol + timeframe + direction */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          {label('Symbol', true)}
          {input(symbol, setSymbol, 'ES')}
        </div>
        <div>
          {label('Timeframe')}
          <select value={timeframe} onChange={e => setTimeframe(e.target.value)}
            className="w-full bg-[#0A0B0D] border border-[#1E2128] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
            {['15min','30min','1h','4h','1day','1week'].map(tf =>
              <option key={tf} value={tf}>{tf}</option>
            )}
          </select>
        </div>
        <div>
          {label('Direction')}
          <div className="flex gap-1.5">
            {['BUY','SELL'].map(d => (
              <button key={d} onClick={() => setDirection(d)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  direction === d
                    ? d === 'BUY' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                  : 'bg-red-500/15 border-red-500/30 text-red-400'
                    : 'bg-[#0A0B0D] border-[#1E2128] text-gray-600'
                }`}>{d}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Emotional state */}
      <div>
        {label('How were you feeling before this trade?')}
        <div className="grid grid-cols-3 gap-1.5">
          {EMOTIONS.map(e => (
            <button key={e.value} onClick={() => setEmotionalState(e.value)}
              className={`py-2 px-2 rounded-xl text-xs font-medium border transition-all ${
                emotionalState === e.value ? `${e.bg} ${e.border} ${e.color}` : 'bg-[#0A0B0D] border-[#1E2128] text-gray-600 hover:text-gray-300'
              }`}>
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pre-trade plan */}
      <div>
        {label('Pre-Trade Plan')}
        {textarea(preTradePlan, setPreTradePlan, 'What setup are you seeing? What confirmation are you waiting for? What is your entry trigger? Be specific.', 4)}
      </div>

      {/* Followed plan */}
      <div>
        {label('Did you follow your plan?')}
        <div className="flex gap-2">
          {[true, false].map(v => (
            <button key={String(v)} onClick={() => setFollowedPlan(v)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                followedPlan === v
                  ? v ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-red-500/15 border-red-500/30 text-red-400'
                  : 'bg-[#0A0B0D] border-[#1E2128] text-gray-600'
              }`}>
              {v ? '✅ Yes' : '❌ No'}
            </button>
          ))}
          <button onClick={() => setFollowedPlan(null)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
              followedPlan === null ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-[#0A0B0D] border-[#1E2128] text-gray-600'
            }`}>N/A</button>
        </div>
      </div>

      {/* Entry notes */}
      <div>
        {label('Execution Notes')}
        {textarea(entryNotes, setEntryNotes, 'How did the entry go? Did you wait for confirmation? Any deviations from the plan?', 3)}
      </div>

      {/* Outcome + P&L */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3">
          {label('Outcome')}
          <div className="grid grid-cols-4 gap-1.5">
            {OUTCOMES.map(o => (
              <button key={o.value} onClick={() => setOutcome(o.value)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all ${
                  outcome === o.value ? `${o.color} bg-white/5 border-current` : 'bg-[#0A0B0D] border-[#1E2128] text-gray-600 hover:text-gray-300'
                }`}>{o.label}</button>
            ))}
          </div>
        </div>
        <div>
          {label('P&L Points')}
          {input(pnlPoints, setPnlPoints, '±0')}
        </div>
        <div>
          {label('P&L Dollars')}
          {input(pnlDollars, setPnlDollars, '±$0')}
        </div>
      </div>

      {/* Post trade */}
      <div>
        {label('Post-Trade Notes')}
        {textarea(postNotes, setPostNotes, 'What happened? Were your levels respected? Any surprises?', 3)}
      </div>

      {/* Lessons */}
      <div>
        {label('Lessons Learned')}
        {textarea(lessons, setLessons, 'What would you do differently? What did this trade teach you?', 2)}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel}
          className="flex-1 py-2.5 bg-[#0A0B0D] border border-[#1E2128] rounded-xl text-sm text-gray-500 hover:text-gray-300 transition-all">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving || !symbol.trim()}
          className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/30 disabled:cursor-not-allowed text-black font-display font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Entry'}
        </button>
      </div>
    </div>
  );
}

// ── AI Feedback ────────────────────────────────────────────────────────────────
function AIFeedbackButton({ entry, onFeedbackSaved }: { entry: JournalEntry; onFeedbackSaved: (id: string, feedback: string) => void }) {
  const [loading, setLoading] = useState(false);

  const getFeedback = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a tough but fair futures trading coach. You review trader journal entries and give concise, honest, actionable feedback. 
Be direct. Don't pad. Point out what they did right, what they did wrong, and specifically what to do differently next time.
If they didn't follow their plan, call it out clearly. If their emotional state suggests a pattern, name it.
Keep feedback under 200 words. No bullet points — write in direct conversational paragraphs.`,
          messages: [{
            role: 'user',
            content: `Review this journal entry:

SYMBOL: ${entry.symbol} ${entry.timeframe} ${entry.direction}
EMOTIONAL STATE: ${entry.emotional_state}
PRE-TRADE PLAN: ${entry.pre_trade_plan || 'Not written'}
FOLLOWED PLAN: ${entry.followed_plan === true ? 'Yes' : entry.followed_plan === false ? 'No' : 'Not answered'}
EXECUTION NOTES: ${entry.entry_notes || 'None'}
OUTCOME: ${entry.outcome}
P&L: ${entry.pnl_points ? `${entry.pnl_points} points / $${entry.pnl_dollars}` : 'Not logged'}
POST-TRADE NOTES: ${entry.post_trade_notes || 'None'}
LESSONS: ${entry.lessons_learned || 'None written'}

Give your honest coaching feedback.`
          }]
        })
      });
      const data = await response.json();
      const feedback = data.content?.[0]?.text || 'Unable to generate feedback.';
      await supabase.from('journal_entries').update({
        ai_feedback: feedback,
        ai_feedback_at: new Date().toISOString(),
      }).eq('id', entry.id);
      onFeedbackSaved(entry.id, feedback);
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  return (
    <button onClick={getFeedback} disabled={loading}
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-400 hover:bg-purple-500/15 transition-all disabled:opacity-50">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
      {loading ? 'Thinking...' : entry.ai_feedback ? 'Refresh Feedback' : 'Get AI Feedback'}
    </button>
  );
}

// ── Journal card ───────────────────────────────────────────────────────────────
function JournalCard({ entry, onFeedbackSaved, onDelete }: {
  entry: JournalEntry;
  onFeedbackSaved: (id: string, feedback: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isBuy  = entry.direction === 'BUY';
  const emo    = emotionCfg(entry.emotional_state);
  const out    = outcomeCfg(entry.outcome);
  const date   = new Date(entry.created_at);

  return (
    <div className="bg-[#111318] border border-[#1E2128] rounded-2xl overflow-hidden">
      <div className={`h-0.5 w-full ${isBuy ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border ${isBuy ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              {isBuy ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-white">{entry.symbol}</span>
                <span className="font-data text-xs text-gray-600">{entry.timeframe}</span>
                <span className={`text-xs font-bold ${out.color}`}>{out.label}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${emo.bg} ${emo.border} ${emo.color}`}>{emo.label}</span>
                <span className="font-data text-[10px] text-gray-600">{date.toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {entry.pnl_dollars !== null && (
              <span className={`font-data text-sm font-bold ${(entry.pnl_dollars || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(entry.pnl_dollars || 0) >= 0 ? '+' : ''}${entry.pnl_dollars?.toFixed(0)}
              </span>
            )}
            <button onClick={() => setExpanded(e => !e)}
              className="p-1 text-gray-600 hover:text-gray-300 transition-all">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Pre-trade plan preview */}
        {entry.pre_trade_plan && !expanded && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{entry.pre_trade_plan}</p>
        )}

        {/* Follow plan badge */}
        {entry.followed_plan !== null && (
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border mb-3 ${
            entry.followed_plan ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {entry.followed_plan ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {entry.followed_plan ? 'Followed the plan' : 'Deviated from plan'}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <AIFeedbackButton entry={entry} onFeedbackSaved={onFeedbackSaved} />
          <button onClick={() => onDelete(entry.id)}
            className="flex items-center gap-1 px-2 py-1.5 text-gray-700 hover:text-red-400 border border-transparent hover:border-red-500/20 rounded-lg text-xs transition-all">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[#1E2128] space-y-3">
            {[
              { label: 'Pre-Trade Plan',       val: entry.pre_trade_plan },
              { label: 'Execution Notes',      val: entry.entry_notes },
              { label: 'Post-Trade Notes',     val: entry.post_trade_notes },
              { label: 'Lessons Learned',      val: entry.lessons_learned },
            ].filter(f => f.val).map(({ label, val }) => (
              <div key={label} className="bg-[#0A0B0D] border border-[#1E2128] rounded-xl p-3">
                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">{label}</div>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{val}</p>
              </div>
            ))}

            {entry.pnl_points !== null && (
              <div className="flex items-center gap-3">
                <div className="bg-[#0A0B0D] border border-[#1E2128] rounded-xl p-3 flex-1 text-center">
                  <div className="text-[10px] text-gray-600 mb-1">P&L Points</div>
                  <div className={`font-data font-bold text-lg ${(entry.pnl_points || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(entry.pnl_points || 0) >= 0 ? '+' : ''}{entry.pnl_points}
                  </div>
                </div>
                <div className="bg-[#0A0B0D] border border-[#1E2128] rounded-xl p-3 flex-1 text-center">
                  <div className="text-[10px] text-gray-600 mb-1">P&L Dollars</div>
                  <div className={`font-data font-bold text-lg ${(entry.pnl_dollars || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(entry.pnl_dollars || 0) >= 0 ? '+' : ''}${entry.pnl_dollars?.toFixed(0)}
                  </div>
                </div>
              </div>
            )}

            {entry.ai_feedback && (
              <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">AI Coach Feedback</span>
                  {entry.ai_feedback_at && (
                    <span className="ml-auto text-[9px] text-gray-700">{new Date(entry.ai_feedback_at).toLocaleDateString()}</span>
                  )}
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{entry.ai_feedback}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function TradingJournalTab({ prefillAnalysis }: { prefillAnalysis?: DataAnalysis | null }) {
  const { isElite, triggerUpgrade } = useTier();
  const [entries,    setEntries]    = useState<JournalEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-open form when prefillAnalysis is set
  useEffect(() => {
    if (prefillAnalysis) setShowForm(true);
  }, [prefillAnalysis]);

  const fetch = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setEntries(data as JournalEntry[]);
    setLoading(false);
    if (showRefresh) setRefreshing(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = (entry: JournalEntry) => {
    setEntries(prev => [entry, ...prev]);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('journal_entries').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleFeedbackSaved = (id: string, feedback: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ai_feedback: feedback, ai_feedback_at: new Date().toISOString() } : e));
  };

  // Stats
  const total      = entries.length;
  const wins       = entries.filter(e => ['TP1_HIT','TP2_HIT','TP3_HIT'].includes(e.outcome));
  const decided    = entries.filter(e => !['PENDING','SKIPPED','MISSED'].includes(e.outcome));
  const winRate    = decided.length > 0 ? Math.round((wins.length / decided.length) * 100) : 0;
  const followed   = entries.filter(e => e.followed_plan === true).length;
  const deviated   = entries.filter(e => e.followed_plan === false).length;
  const totalPnl   = entries.reduce((sum, e) => sum + (e.pnl_dollars || 0), 0);
  const greedyFomo = entries.filter(e => ['GREEDY','FOMO'].includes(e.emotional_state)).length;

  // Prefill from analysis
  const prefill: Partial<JournalEntry> | undefined = prefillAnalysis ? {
    analysis_id:  prefillAnalysis.id,
    symbol:       prefillAnalysis.symbol,
    timeframe:    prefillAnalysis.timeframe || '1h',
    direction:    prefillAnalysis.direction || 'BUY',
    pre_trade_plan: prefillAnalysis.higher_tf_bias
      ? `HTF Bias: ${prefillAnalysis.higher_tf_bias}\nSetup: ${prefillAnalysis.direction} ${prefillAnalysis.symbol} ${prefillAnalysis.confidence}% confidence\nEntry zone: ${prefillAnalysis.entry_zone_min}–${prefillAnalysis.entry_zone_max}`
      : '',
  } : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

        {/* ── Left panel ──────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Stats */}
          <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span className="font-display font-bold text-sm text-white">Journal Stats</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#0A0B0D] rounded-xl p-3">
                <div className="text-[10px] text-gray-600 mb-1">Entries</div>
                <div className="font-data font-bold text-xl text-white">{total}</div>
              </div>
              <div className="bg-[#0A0B0D] rounded-xl p-3">
                <div className="text-[10px] text-gray-600 mb-1">Win Rate</div>
                <div className={`font-data font-bold text-xl ${winRate >= 60 ? 'text-emerald-400' : winRate >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{winRate}%</div>
              </div>
              <div className="bg-[#0A0B0D] rounded-xl p-3">
                <div className="text-[10px] text-gray-600 mb-1">Plan Followed</div>
                <div className="font-data font-bold text-xl text-emerald-400">{followed}</div>
              </div>
              <div className="bg-[#0A0B0D] rounded-xl p-3">
                <div className="text-[10px] text-gray-600 mb-1">Deviated</div>
                <div className="font-data font-bold text-xl text-red-400">{deviated}</div>
              </div>
              <div className="bg-[#0A0B0D] rounded-xl p-3 col-span-2">
                <div className="text-[10px] text-gray-600 mb-1">Total P&L</div>
                <div className={`font-data font-bold text-xl ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(0)}
                </div>
              </div>
            </div>
            {greedyFomo > 0 && (
              <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs text-orange-400 font-semibold">Pattern Alert</span>
                </div>
                <p className="text-xs text-orange-300/70 mt-1">{greedyFomo} entries logged under Greedy or FOMO state. Review these entries for emotional trading patterns.</p>
              </div>
            )}
          </div>

          <button onClick={() => fetch(true)} disabled={refreshing}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#111318] border border-[#1E2128] hover:border-amber-500/20 text-gray-500 hover:text-amber-400 rounded-xl text-sm transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ── Right panel ─────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* New entry button */}
          {!showForm && (
            <button onClick={() => isElite ? setShowForm(true) : triggerUpgrade("Trading Journal")}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-black font-display font-bold text-sm rounded-2xl transition-all">
              <Plus className="w-4 h-4" />
              New Journal Entry
            </button>
          )}

          {/* Form */}
          {showForm && (
            <EntryForm
              prefill={prefill}
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
            />
          )}

          {/* Entries */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-[#111318] border border-[#1E2128] rounded-2xl animate-pulse" />)}
            </div>
          ) : entries.length === 0 && !showForm ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-[#111318] border border-[#1E2128] rounded-2xl flex items-center justify-center mb-4">
                <BookOpen className="w-7 h-7 text-gray-700" />
              </div>
              <h3 className="font-display font-semibold text-white mb-2">No journal entries yet</h3>
              <p className="text-gray-600 text-sm max-w-xs">Start your first entry above, or click the Journal button on any trade in the History tab to pre-fill it automatically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map(entry => (
                <JournalCard
                  key={entry.id}
                  entry={entry}
                  onFeedbackSaved={handleFeedbackSaved}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
