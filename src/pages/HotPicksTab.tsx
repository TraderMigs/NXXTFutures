import { useState, useEffect, useCallback } from 'react';
import { Flame, RefreshCw, Filter, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { supabase, FuturesSignal } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AccountPanel } from '../components/AccountPanel';
import { SignalCard } from '../components/SignalCard';
import { FUTURES_CATEGORIES, FUTURES_MAP } from '../lib/futuresSymbols';

export function HotPicksTab() {
  const { user } = useAuth();
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
              {filtered.map(signal => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  accountBalance={accountBalance}
                  riskPercent={riskPercent}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
