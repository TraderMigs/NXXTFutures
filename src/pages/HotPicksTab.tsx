import { useState, useEffect, useCallback } from 'react';
import { Flame, RefreshCw, Filter, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { supabase, FuturesSignal } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTier } from '../contexts/TierContext';
import { Lock, Crown } from 'lucide-react';
import { AccountPanel } from '../components/AccountPanel';
import { SignalCard } from '../components/SignalCard';
import { FUTURES_CATEGORIES, FUTURES_MAP } from '../lib/futuresSymbols';

export function HotPicksTab() {
  const { user } = useAuth();
  const { isElite, triggerUpgrade } = useTier();
  const [signals, setSignals] = useState<FuturesSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accountBalance, setAccountBalance] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterDirection, setFilterDirection] = useState<string>('ALL');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSignals = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('futures_signals')
        .select('*')
        .in('status', ['ACTIVE'])
        .order('confidence', { ascending: false })
        .order('generated_at', { ascending: false });

      if (!error && data) {
        setSignals(data);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();

    // Real-time subscription — new signals auto-appear
    const channel = supabase
      .channel('futures_signals')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'futures_signals',
      }, () => {
        fetchSignals();
      })
      .subscribe();

    // Polling fallback every 2 minutes
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

  // Filter signals
  const filtered = signals.filter(s => {
    if (filterDirection !== 'ALL' && s.direction !== filterDirection) return false;
    // Category filter based on symbol
    if (filterCategory !== 'ALL') {
      const config = FUTURES_MAP[s.symbol];
      if (config?.category !== filterCategory) return false;
    }
    return true;
  });

  // Stats
  // ── Free tier: 1 signal at/after NY open ───────────────────────
  const getNYOpenSignal = (signals: FuturesSignal[]) => {
    const now = new Date();
    // NY Open = 14:30 UTC (9:30 AM EST)
    const nyOpenUTC = new Date(now);
    nyOpenUTC.setUTCHours(14, 30, 0, 0);
    // If before NY open today, use yesterday's open
    if (now < nyOpenUTC) {
      nyOpenUTC.setUTCDate(nyOpenUTC.getUTCDate() - 1);
    }
    // Return highest confidence signal generated after NY open
    const afterOpen = signals
      .filter(s => new Date(s.generated_at) >= nyOpenUTC)
      .sort((a, b) => b.confidence - a.confidence);
    return afterOpen[0] || signals.sort((a, b) => b.confidence - a.confidence)[0] || null;
  };

  const freeSignal = !isElite ? getNYOpenSignal(filtered) : null;
  const visibleSignals   = isElite ? filtered : (freeSignal ? [freeSignal] : []);
  const lockedSignals    = !isElite ? filtered.filter(s => s.id !== freeSignal?.id) : [];

  const buys = filtered.filter(s => s.direction === 'BUY').length;
  const sells = filtered.filter(s => s.direction === 'SELL').length;
  const highConf = filtered.filter(s => s.confidence >= 85).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">

        {/* ── Left Column: Account + Controls ───────────────────────── */}
        <div className="space-y-4">
          {/* Account Panel */}
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

          {/* Filters */}
          <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-display font-semibold text-xs text-gray-400 uppercase tracking-wider">Filters</span>
            </div>

            {/* Direction filter */}
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 block">Direction</label>
              <div className="flex gap-1.5">
                {['ALL', 'BUY', 'SELL'].map(d => (
                  <button
                    key={d}
                    onClick={() => setFilterDirection(d)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      filterDirection === d
                        ? d === 'BUY'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : d === 'SELL'
                          ? 'bg-red-500/15 border-red-500/30 text-red-400'
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-[#0A0B0D] border-[#1E2128] text-gray-600 hover:text-gray-300'
                    }`}
                  >
                    {d === 'BUY' && <TrendingUp className="w-3 h-3 inline mr-1" />}
                    {d === 'SELL' && <TrendingDown className="w-3 h-3 inline mr-1" />}
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 block">Category</label>
              <div className="space-y-1">
                {['ALL', ...FUTURES_CATEGORIES].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all border ${
                      filterCategory === cat
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-[#0A0B0D] border-[#1E2128] text-gray-600 hover:text-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchSignals(true)}
            disabled={refreshing}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#111318] border border-[#1E2128] hover:border-amber-500/20 text-gray-500 hover:text-amber-400 rounded-xl text-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Signals'}
          </button>
        </div>

        {/* ── Right Column: Signal Cards ─────────────────────────────── */}
        <div>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#111318] border border-[#1E2128] rounded-2xl h-40 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-[#111318] border border-[#1E2128] rounded-2xl flex items-center justify-center mb-4">
                <Flame className="w-7 h-7 text-gray-700" />
              </div>
              <h3 className="font-display font-semibold text-white mb-2">No active signals</h3>
              <p className="text-gray-600 text-sm max-w-xs">
                Signals will auto-appear here when the scanner finds valid setups.
                {filterCategory !== 'ALL' || filterDirection !== 'ALL' ? ' Try clearing your filters.' : ''}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Free tier banner */}
              {!isElite && (
                <div className="px-4 py-3 rounded-2xl flex items-center gap-3"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-amber-400">Free Trader — 1 Daily Pick</div>
                    <div className="text-[10px] text-gray-600 mt-0.5">
                      {lockedSignals.length} more signal{lockedSignals.length !== 1 ? 's' : ''} locked today. Upgrade to Elite for all signals.
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

              {/* Locked signals — blurred preview cards */}
              {lockedSignals.slice(0, 4).map((signal, idx) => (
                <div key={signal.id} className="relative rounded-2xl overflow-hidden cursor-pointer"
                  onClick={() => triggerUpgrade('all Hot Picks signals')}
                  style={{ filter: 'none' }}>
                  {/* Blurred inner */}
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
                  {/* Lock overlay */}
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

              {/* "More signals locked" summary if > 4 locked */}
              {lockedSignals.length > 4 && (
                <button onClick={() => triggerUpgrade('all Hot Picks signals')}
                  className="w-full py-4 rounded-2xl text-sm font-bold transition-all"
                  style={{
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px dashed rgba(245,158,11,0.2)',
                    color: '#F59E0B',
                  }}>
                  +{lockedSignals.length - 4} more signals locked — Upgrade to Elite
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
