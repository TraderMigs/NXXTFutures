import { useState } from 'react';
import { Flame, BarChart2, LogOut, Activity, History, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { HotPicksTab } from './HotPicksTab';
import { DataAnalysisTab } from './DataAnalysisTab';
import { TradeHistoryTab } from './TradeHistoryTab';
import { TradingJournalTab } from './TradingJournalTab';
import { DataAnalysis } from '../lib/supabase';

type Tab = 'hot-picks' | 'data-analysis' | 'journal' | 'history';

export function AppShell() {
  const [activeTab,        setActiveTab]        = useState<Tab>('hot-picks');
  const [journalPrefill,   setJournalPrefill]   = useState<DataAnalysis | null>(null);
  const { signOut } = useAuth();

  const handleJournalCreate = (analysis: DataAnalysis) => {
    setJournalPrefill(analysis);
    setActiveTab('journal');
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode; mobileLabel: string }[] = [
    { id: 'hot-picks',     label: 'Hot Picks',    mobileLabel: 'Picks',    icon: <Flame    className="w-4 h-4" /> },
    { id: 'data-analysis', label: 'Data Analysis', mobileLabel: 'Analysis', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'journal',       label: 'Journal',      mobileLabel: 'Journal',  icon: <BookOpen className="w-4 h-4" /> },
    { id: 'history',       label: 'History',      mobileLabel: 'History',  icon: <History  className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0A0B0D] flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-[#0A0B0D]/95 backdrop-blur-xl border-b border-[#1E2128] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-center">
                <span className="font-display font-bold text-amber-400 text-xs">NF</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-white text-sm tracking-tight">NXXT Futures</span>
                <span className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-data text-emerald-400">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
            </div>

            {/* Nav tabs */}
            <nav className="flex items-center gap-0.5">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:block">{tab.label}</span>
                  <span className="sm:hidden text-xs">{tab.mobileLabel}</span>
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                  )}
                </button>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#111318] border border-[#1E2128] rounded-lg">
                <Activity className="w-3 h-3 text-amber-500" />
                <span className="font-data text-[10px] text-gray-500 uppercase tracking-wider">Private</span>
              </div>
              <button
                onClick={signOut}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-all"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab Content ─────────────────────────────────────────────── */}
      <main className="flex-1">
        <div className={activeTab === 'hot-picks'     ? 'block' : 'hidden'}><HotPicksTab /></div>
        <div className={activeTab === 'data-analysis' ? 'block' : 'hidden'}><DataAnalysisTab /></div>
        <div className={activeTab === 'journal'       ? 'block' : 'hidden'}>
          <TradingJournalTab
            prefillAnalysis={activeTab === 'journal' ? journalPrefill : null}
          />
        </div>
        <div className={activeTab === 'history'       ? 'block' : 'hidden'}>
          <TradeHistoryTab onJournalCreate={handleJournalCreate} />
        </div>
      </main>
    </div>
  );
}
