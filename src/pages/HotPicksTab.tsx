import { useState, useEffect, useCallback } from 'react';
import {
  Flame, RefreshCw, Filter, TrendingUp, TrendingDown, Zap,
  ChevronDown, ChevronUp, Clock, Trophy, SlidersHorizontal,
  ArrowUpDown, ShieldOff, Star
} from 'lucide-react';
import { supabase, FuturesSignal } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTier } from '../contexts/TierContext';
import { Lock, Crown } from 'lucide-react';
import { AccountPanel } from '../components/AccountPanel';
import { SignalCard } from '../components/SignalCard';
import { FUTURES_CATEGORIES, FUTURES_MAP } from '../lib/futuresSymbols';

// ── Types ─────────────────────────────────────────────────────────────────────
type SortOption   = 'confidence' | 'newest' | 'oldest';
type AgeOption    = 'ALL' | '1h' | '4h' | '8h';
type ConfOption   = 'ALL' | '75' | '80' | '85';
type RROption     = 'ALL' | '1.5' | '2' | '3';

export function HotPicksTab() {
  const { user } = useAuth();
  const { isElite, triggerUpgrade } = useTier();

  // Data
  const [signals,       setSignals]       = useState<FuturesSignal[]>([]);
  const [closedSignals, setClosedSignals] = useState<FuturesSignal[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [lastUpdated,   setLastUpdated]   = useState<Date | null>(null);
  const [showClosed,    setShowClosed]    = useState(false);
  const [showAdvanced,  setShowAdvanced]  = useState(false);

  // Account
  const [accountBalance, setAccountBalance] = useState(10000);
  const [riskPercent,    setRiskPercent]    = useState(1);

  // Filters
  const [filterCategory,    setFilterCategory]    = useState<string>('ALL');
  const [filterDirection,   setFilterDirection]   = useState<string>('ALL');
  const [filterAge,         setFilterAge]         = useState<AgeOption>('ALL');
  const [filterTradeable,   setFilterTradeable]   = useState(false);
  const [filterHideCounter, setFilterHideCounter] = useState(false);
  const [filterConf,        setFilterConf]        = useState<ConfOption>('ALL');
  const [filterRR,          setFilterRR]          = useState<RROption>('ALL');
  const [sortBy,            setSortBy]            = useState<SortOption>('confidence');

  // ── Fetch active signals ──────────────────────────────────────────────────
  // CRIT-02 FIX: Elite users query the table directly (RLS allows it).
  // Free users call get_free_tier_signals() RPC which returns all signal
  // metadata but NULLS OUT trade data (entry zones, TPs, SL) for locked
  // signals — backend-enforced, not just cosmetic CSS blur.
  const fetchSignals = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      let activeData: any[] | null = null;
      let activeError: any = null;

      if (isElite) {
        // Elite: direct table access, all fields returned
        const { data, error } = await supabase
          .from('futures_signals')
          .select('*')
          .in('status', ['ACTIVE'])
          .order('confidence', { ascending: false })
          .order('generated_at', { ascending: false });
        activeData = data;
        activeError = error;
      } else {
        // Free: use RPC — trade data is nulled on the server for locked signals
        const { data, error } = await supabase.rpc('get_free_tier_signals');
        activeData = data;
        activeError = error;
      }

      if (!activeError && activeData) {
        setSignals(activeData);
        setLastUpdated(new Date());
      }

      // Today's closed signals — Elite only (free users don't see history)
      if (isElite) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: closed, error: e2 } = await supabase
          .from('futures_signals')
          .select('*')
          .in('status', ['TP1_HIT', 'TP2_HIT', 'TP3_HIT', 'STOPPED_OUT', 'EXPIRED'])
          .gte('status_updated_at', todayStart.toISOString())
          .order('status_updated_at', { ascending: false })
          .limit(20);
        if (!e2 && closed) setClosedSignals(closed);
      }

    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  }, [isElite]);

  useEffect(() => {
    fetchSignals();

    const channel = supabase
      .channel('futures_signals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'futures_signals' }, () => {
        fetchSignals();
      })
      .subscribe();

    const interval = setInterval(() => fetchSignals(), 120000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchSignals]);

  const handleSettingsChange = (balance: number, risk: number) => {
    setAccountBalance(balance);
    setRiskPercent(risk);
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const applyFilters = (list: FuturesSignal[]): FuturesSignal[] => {
    const now = Date.now();

    return list.filter(s => {
      // Direction
      if (filterDirection !== 'ALL' && s.direction !== filterDirection) return false;

      // Category
      if (filterCategory !== 'ALL') {
        const config = FUTURES_MAP[s.symbol];
        if (config?.category !== filterCategory) return false;
      }

      // Age
      if (filterAge !== 'ALL') {
        const ageMs = now - new Date(s.generated_at).getTime();
        const limitMs = parseInt(filterAge) * 60 * 60 * 1000;
        if (ageMs > limitMs) return false;
      }

      // Tradeable only (AT_ENTRY or PENDING, not MISSED)
      if (filterTradeable && s.setup_status === 'MISSED') return false;

      // Hide counter-trend
      if (filterHideCounter && s.is_counter_trend) return false;

      // Confidence threshold
      if (filterConf !== 'ALL' && s.confidence < parseInt(filterConf)) return false;

      // R:R minimum
      if (filterRR !== 'ALL') {
        const rrNum = parseFloat(s.risk_reward?.replace('1:', '') || '0');
        if (rrNum < parseFloat(filterRR)) return false;
      }

      return true;
    });
  };

  // ── Sorting ───────────────────────────────────────────────────────────────
  const applySort = (list: FuturesSignal[]): FuturesSignal[] => {
    return [...list].sort((a, b) => {
      if (sortBy === 'confidence') return b.confidence - a.confidence;
      if (sortBy === 'newest')     return new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime();
      if (sortBy === 'oldest')     return new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime();
      return 0;
    });
  };

  const filtered = applySort(applyFilters(signals));

  // Free tier logic
  // CRIT-02 FIX: For free users, signals come from get_free_tier_signals() RPC.
  // The is_locked field is set by the server — locked signals have null trade data.
  // We use this to split visible vs locked for the blur teaser UI.
  const getNYOpenSignal = (sigs: FuturesSignal[]) => {
    const now = new Date();
    const nyOpenUTC = new Date(now);
    nyOpenUTC.setUTCHours(14, 30, 0, 0);
    if (now < nyOpenUTC) nyOpenUTC.setUTCDate(nyOpenUTC.getUTCDate() - 1);
    const afterOpen = sigs
      .filter(s => new Date(s.generated_at) >= nyOpenUTC)
      .sort((a, b) => b.confidence - a.confidence);
    return afterOpen[0] || sigs.sort((a, b) => b.confidence - a.confidence)[0] || null;
  };

  // CRIT-02 FIX: For free users, is_locked comes from the RPC function (server-enforced).
  // For elite users, nothing is locked.
  const freeSignal     = !isElite ? filtered.find((s: any) => !s.is_locked) || null : null;
  const visibleSignals = isElite ? filtered : (freeSignal ? [freeSignal] : []);
  const lockedSignals  = !isElite ? filtered.filter((s: any) => s.is_locked) : [];

  const buys     = filtered.filter(s => s.direction === 'BUY').length;
  const sells    = filtered.filter(s => s.direction === 'SELL').length;
  const highConf = filtered.filter(s => s.confidence >= 85).length;

  // Active filter count for badge
  const activeFilterCount = [
    filterDirection !== 'ALL',
    filterCategory !== 'ALL',
    filterAge !== 'ALL',
    filterTradeable,
    filterHideCounter,
    filterConf !== 'ALL',
    filterRR !== 'ALL',
    sortBy !== 'confidence',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterDirection('ALL');
    setFilterCategory('ALL');
    setFilterAge('ALL');
    setFilterTradeable(false);
    setFilterHideCounter(false);
    setFilterConf('ALL');
    setFilterRR('ALL');
    setSortBy('confidence');
  };

  // ── Closed trade icon helper ──────────────────────────────────────────────
  const getClosedBadge = (status: FuturesSignal['status']) => {
    switch (status) {
      case 'TP1_HIT':     return { label: 'TP1 ✓',  cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'TP2_HIT':     return { label: 'TP2 ✓',  cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'TP3_HIT':     return { label: 'FULL ✓', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'STOPPED_OUT': return { label: 'STOP ✗', cls: 'bg-red-500/15 text-red-400 border-red-500/30' };
      case 'EXPIRED':     return { label: 'EXPIRED', cls: 'bg-gray-500/15 text-gray-500 border-gray-500/20' };
      default:            return { label: status,    cls: 'bg-gray-500/15 text-gray-500 border-gray-500/20' };
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">

        {/* ── Left Column ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <AccountPanel onSettingsChange={handleSettingsChange} />

          {/* Stats */}
          <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="font-display font-semibold text-sm text-white">Live Signals</span>
              {lastUpdated && (
                <span className="ml-auto font-data text-[10px] text-gray-600">
                  {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#0A0B0D] rounded-xl p-3 text-center">
                <div className="font-data font-bold text-xl text-white">{filtered.length}</div>
                <div className="font-data text-[10px] text-gray-600 mt-0.5">TOTAL</div>
              </div>
              <div className="bg-[#0A0B0D] rounded-xl p-3 text-center">
                <div className="font-data font-bold text-xl text-emerald-400">{buys}</div>
                <div className="font-data text-[10px] text-gray-600 mt-0.5">BUYS</div>
              </div>
              <div className="bg-[#0A0B0D] rounded-xl p-3 text-center">
                <div className="font-data font-bold text-xl text-red-400">{sells}</div>
                <div className="font-data text-[10px] text-gray-600 mt-0.5">SELLS</div>
              </div>
            </div>
            {highConf > 0 && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-400 font-medium">{highConf} high-confidence signal{highConf !== 1 ? 's' : ''} (85%+)</span>
              </div>
            )}
          </div>

          {/* ── Filters Panel ─────────────────────────────────────────── */}
          <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-4 space-y-4">

            {/* Header */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-display font-semibold text-xs text-gray-400 uppercase tracking-wider">Filters</span>
              {activeFilterCount > 0 && (
                <>
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {activeFilterCount}
                  </span>
                  <button onClick={clearFilters} className="ml-auto text-[10px] text-gray-600 hover:text-amber-400 transition-colors">
                    Clear all
                  </button>
                </>
              )}
            </div>

            {/* Sort */}
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" /> Sort By
              </label>
              <div className="flex gap-1.5">
                {([
                  { value: 'confidence', label: 'Top Confidence' },
                  { value: 'newest',     label: 'Newest' },
                  { value: 'oldest',     label: 'Oldest' },
                ] as { value: SortOption; label: string }[]).map(opt => (
                  <button key={opt.value} onClick={() => setSortBy(opt.value)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                      sortBy === opt.value
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-[#0A0B0D] border-[#1E2128] text-gray-600 hover:text-gray-300'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Direction */}
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 block">Direction</label>
              <div className="flex gap-1.5">
                {['ALL', 'BUY', 'SELL'].map(d => (
                  <button key={d} onClick={() => setFilterDirection(d)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      filterDirection === d
                        ? d === 'BUY'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : d === 'SELL'
                          ? 'bg-red-500/15 border-red-500/30 text-red-400'
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-[#0A0B0D] border-[#1E2128] text-gray-600 hover:text-gray-300'
                    }`}>
                    {d === 'BUY' && <TrendingUp className="w-3 h-3 inline mr-1" />}
                    {d === 'SELL' && <TrendingDown className="w-3 h-3 inline mr-1" />}
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Age */}
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Signal Age
              </label>
              <div className="flex gap-1.5">
                {([
                  { value: 'ALL', label: 'Any' },
                  { value: '1h',  label: '< 1h' },
                  { value: '4h',  label: '< 4h' },
                  { value: '8h',  label: '< 8h' },
                ] as { value: AgeOption; label: string }[]).map(opt => (
                  <button key={opt.value} onClick={() => setFilterAge(opt.value)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                      filterAge === opt.value
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-[#0A0B0D] border-[#1E2128] text-gray-600 hover:text-gray-300'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tradeable only toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-300 font-medium">Tradeable Only</div>
                <div className="text-[10px] text-gray-600">Hides "Entry Missed" signals</div>
              </div>
              <button onClick={() => setFilterTradeable(!filterTradeable)}
                className={`relative w-10 h-5 rounded-full transition-all border ${
                  filterTradeable ? 'bg-emerald-500/30 border-emerald-500/50' : 'bg-[#0A0B0D] border-[#1E2128]'
                }`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                  filterTradeable ? 'left-5 bg-emerald-400' : 'left-0.5 bg-gray-600'
                }`} />
              </button>
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 block">Category</label>
              <div className="space-y-1">
                {['ALL', ...FUTURES_CATEGORIES].map(cat => (
                  <button key={cat} onClick={() => setFilterCategory(cat)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all border ${
                      filterCategory === cat
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-[#0A0B0D] border-[#1E2128] text-gray-600 hover:text-gray-300'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced toggle */}
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-3 py-2 bg-[#0A0B0D] border border-[#1E2128] rounded-xl text-xs text-gray-600 hover:text-gray-300 transition-all">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3 h-3" />
                Advanced Filters
              </span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Advanced section */}
            {showAdvanced && (
              <div className="space-y-4 pt-1 border-t border-[#1E2128]">

                {/* Confidence threshold */}
                <div>
                  <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Star className="w-3 h-3" /> Min Confidence
                  </label>
                  <div className="flex gap-1.5">
                    {([
                      { value: 'ALL', label: 'Any' },
                      { value: '75',  label: '75%+' },
                      { value: '80',  label: '80%+' },
                      { value: '85',  label: '85%+' },
                    ] as { value: ConfOption; label: string }[]).map(opt => (
                      <button key={opt.value} onClick={() => setFilterConf(opt.value)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                          filterConf === opt.value
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            : 'bg-[#0A0B0D] border-[#1E2128] text-gray-600 hover:text-gray-300'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* R:R minimum */}
                <div>
                  <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 block">Min Risk:Reward</label>
                  <div className="flex gap-1.5">
                    {([
                      { value: 'ALL', label: 'Any' },
                      { value: '1.5', label: '1:1.5+' },
                      { value: '2',   label: '1:2+' },
                      { value: '3',   label: '1:3+' },
                    ] as { value: RROption; label: string }[]).map(opt => (
                      <button key={opt.value} onClick={() => setFilterRR(opt.value)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                          filterRR === opt.value
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            : 'bg-[#0A0B0D] border-[#1E2128] text-gray-600 hover:text-gray-300'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hide counter-trend toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-300 font-medium flex items-center gap-1">
                      <ShieldOff className="w-3 h-3 text-orange-400" /> Hide Counter-Trend
                    </div>
                    <div className="text-[10px] text-gray-600">Remove riskier CT setups</div>
                  </div>
                  <button onClick={() => setFilterHideCounter(!filterHideCounter)}
                    className={`relative w-10 h-5 rounded-full transition-all border ${
                      filterHideCounter ? 'bg-orange-500/30 border-orange-500/50' : 'bg-[#0A0B0D] border-[#1E2128]'
                    }`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                      filterHideCounter ? 'left-5 bg-orange-400' : 'left-0.5 bg-gray-600'
                    }`} />
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Refresh */}
          <button onClick={() => fetchSignals(true)} disabled={refreshing}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#111318] border border-[#1E2128] hover:border-amber-500/20 text-gray-500 hover:text-amber-400 rounded-xl text-sm transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Signals'}
          </button>
        </div>

        {/* ── Right Column: Signal Cards ─────────────────────────────── */}
        <div className="space-y-6">

          {/* Active signals */}
          <div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-[#111318] border border-[#1E2128] rounded-2xl h-14 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 bg-[#111318] border border-[#1E2128] rounded-2xl flex items-center justify-center mb-4">
                  <Flame className="w-7 h-7 text-gray-700" />
                </div>
                <h3 className="font-display font-semibold text-white mb-2">No active signals</h3>
                <p className="text-gray-600 text-sm max-w-xs">
                  {activeFilterCount > 0
                    ? 'No signals match your current filters. Try clearing some.'
                    : 'Signals will auto-appear here when the scanner finds valid setups.'}
                </p>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters}
                    className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Free tier banner */}
                {!isElite && (
                  <div className="px-4 py-3 rounded-2xl flex items-center gap-3 mb-3"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-amber-400">Free Trader — 1 Daily Pick</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">
                        {lockedSignals.length} more signal{lockedSignals.length !== 1 ? 's' : ''} locked. Upgrade to Elite for all.
                      </div>
                    </div>
                    <button onClick={() => triggerUpgrade('all Hot Picks signals')}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
                      Upgrade
                    </button>
                  </div>
                )}

                {/* Visible signals */}
                {visibleSignals.map(signal => (
                  <SignalCard
                    key={signal.id}
                    signal={signal}
                    accountBalance={accountBalance}
                    riskPercent={riskPercent}
                  />
                ))}

                {/* Locked signals */}
                {lockedSignals.slice(0, 4).map(signal => (
                  <div key={signal.id} className="relative rounded-2xl overflow-hidden cursor-pointer"
                    onClick={() => triggerUpgrade('all Hot Picks signals')}>
                    <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
                      <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5">
                        <div className={`h-0.5 w-full mb-4 ${signal.direction === 'BUY' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-display font-bold text-white text-xl">{signal.symbol}</div>
                            <div className="font-data text-xs text-gray-600">{signal.timeframe} · SMC</div>
                          </div>
                          <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${signal.direction === 'BUY' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                            {signal.direction}
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Confidence: {signal.confidence}%</span>
                          <span>{signal.risk_reward}</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
                      style={{ background: 'rgba(4,5,10,0.65)', backdropFilter: 'blur(2px)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                        <Lock className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="text-xs font-bold text-white mb-1">Elite Signal Locked</div>
                      <div className="text-[10px] text-gray-500">Tap to unlock with Elite</div>
                    </div>
                  </div>
                ))}

                {lockedSignals.length > 4 && (
                  <button onClick={() => triggerUpgrade('all Hot Picks signals')}
                    className="w-full py-4 rounded-2xl text-sm font-bold transition-all"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px dashed rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                    +{lockedSignals.length - 4} more signals locked — Upgrade to Elite
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Today's Closed Trades ───────────────────────────────── */}
          {closedSignals.length > 0 && (
            <div className="bg-[#111318] border border-[#1E2128] rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowClosed(!showClosed)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <Trophy className="w-4 h-4 text-gray-500" />
                <span className="font-display font-semibold text-sm text-gray-400">Today's Closed Trades</span>
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1E2128] text-gray-500">
                  {closedSignals.length}
                </span>
                <span className="ml-auto text-gray-600">
                  {showClosed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>

              {showClosed && (
                <div className="border-t border-[#1E2128] divide-y divide-[#1E2128]">
                  {closedSignals.map(signal => {
                    const badge = getClosedBadge(signal.status);
                    const isBuy = signal.direction === 'BUY';
                    return (
                      <div key={signal.id} className="flex items-center gap-3 px-4 py-3">
                        {/* Symbol */}
                        <div className="min-w-[40px]">
                          <div className="font-display font-bold text-sm text-white">{signal.symbol}</div>
                          <div className="font-data text-[10px] text-gray-600">{signal.timeframe}</div>
                        </div>
                        {/* Direction */}
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${isBuy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {isBuy ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                          {signal.direction}
                        </div>
                        {/* Confidence */}
                        <span className="font-data text-xs text-gray-600">{signal.confidence}%</span>
                        {/* Status badge */}
                        <div className={`ml-auto px-2 py-0.5 rounded border text-[10px] font-bold ${badge.cls}`}>
                          {badge.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
