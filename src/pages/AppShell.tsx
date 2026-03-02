import { useState, useEffect } from 'react';
import { Flame, BarChart2, LogOut, History, BookOpen, Menu, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { HotPicksTab }       from './HotPicksTab';
import { DataAnalysisTab }   from './DataAnalysisTab';
import { TradeHistoryTab }   from './TradeHistoryTab';
import { TradingJournalTab } from './TradingJournalTab';
import { PWAInstallPrompt }  from '../components/PWAInstallPrompt';
import { UpgradeModal }      from '../components/UpgradeModal';
import { TierProvider }      from '../contexts/TierContext';
import { DataAnalysis }      from '../lib/supabase';

type Tab = 'hot-picks' | 'data-analysis' | 'journal' | 'history';

const TABS: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'hot-picks',     label: 'Hot Picks',     icon: <Flame    className="w-5 h-5" />, description: 'Live AI signals' },
  { id: 'data-analysis', label: 'Data Analysis',  icon: <BarChart2 className="w-5 h-5" />, description: 'Analyze any futures chart' },
  { id: 'journal',       label: 'Journal',        icon: <BookOpen className="w-5 h-5" />, description: 'Trade journal & AI coaching' },
  { id: 'history',       label: 'History',        icon: <History  className="w-5 h-5" />, description: 'All past analyses' },
];

export function AppShell() {
  const [activeTab,      setActiveTab]      = useState<Tab>('hot-picks');
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [journalPrefill, setJournalPrefill] = useState<DataAnalysis | null>(null);
  const { signOut } = useAuth();

  // Close menu on resize to desktop
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 640) setMenuOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Prevent body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleTabSelect = (tab: Tab) => {
    setActiveTab(tab);
    setMenuOpen(false);
  };

  const handleJournalCreate = (analysis: DataAnalysis) => {
    setJournalPrefill(analysis);
    setActiveTab('journal');
  };

  const currentTab = TABS.find(t => t.id === activeTab)!;

  return (
    <TierProvider>
    <div className="min-h-screen bg-[#0A0B0D] flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-[#0A0B0D]/95 backdrop-blur-xl border-b border-[#1E2128] sticky top-0 z-50"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-center">
                <span className="font-display font-bold text-amber-400 text-xs">NF</span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="font-display font-bold text-white text-sm tracking-tight">NXXT Futures</span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-data text-emerald-400">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />LIVE
                </span>
              </div>
              {/* Mobile: show current tab name */}
              <div className="sm:hidden flex items-center gap-1.5">
                <span className="text-amber-400">{currentTab.icon && <span className="[&>svg]:w-4 [&>svg]:h-4">{currentTab.icon}</span>}</span>
                <span className="font-display font-bold text-white text-sm">{currentTab.label}</span>
              </div>
            </div>

            {/* Desktop nav tabs */}
            <nav className="hidden sm:flex items-center gap-0.5">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => handleTabSelect(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}>
                  {tab.icon}
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                  )}
                </button>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <button onClick={signOut}
                className="hidden sm:flex p-2 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-all"
                title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
              {/* Hamburger — mobile only */}
              <button onClick={() => setMenuOpen(o => !o)}
                className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-[#111318] border border-[#1E2128] text-gray-400 hover:text-white transition-all"
                aria-label="Menu">
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Slide-in Drawer ──────────────────────────────────── */}
      {/* Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 sm:hidden backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
          style={{ animation: 'fadeIn 0.2s ease' }}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 bottom-0 w-72 bg-[#111318] border-l border-[#1E2128] z-50 sm:hidden flex flex-col transition-transform duration-300 ease-out ${
        menuOpen ? 'translate-x-0' : 'translate-x-full'
      }`} style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-[#1E2128] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-center">
              <span className="font-display font-bold text-amber-400 text-[10px]">NF</span>
            </div>
            <span className="font-display font-bold text-white text-sm">NXXT Futures</span>
          </div>
          <button onClick={() => setMenuOpen(false)} className="p-1.5 text-gray-600 hover:text-gray-300 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live badge */}
        <div className="px-5 py-3 border-b border-[#1E2128] flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/5 border border-emerald-500/15 rounded-xl w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-data text-[10px] text-emerald-400 tracking-wider">LIVE DATA</span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => handleTabSelect(tab.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all border-l-2 ${
                activeTab === tab.id
                  ? 'bg-amber-500/8 border-l-amber-400 text-amber-400'
                  : 'border-l-transparent text-gray-500 hover:text-gray-200 hover:bg-white/3'
              }`}>
              <div className={`flex-shrink-0 ${activeTab === tab.id ? 'text-amber-400' : 'text-gray-600'}`}>
                {tab.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-display font-semibold text-sm ${activeTab === tab.id ? 'text-amber-400' : 'text-gray-200'}`}>
                  {tab.label}
                </div>
                <div className="font-data text-[10px] text-gray-600 mt-0.5">{tab.description}</div>
              </div>
              <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${activeTab === tab.id ? 'text-amber-400' : 'text-gray-700'}`} />
            </button>
          ))}
        </nav>

        {/* Drawer footer */}
        <div className="px-5 pb-6 pt-3 border-t border-[#1E2128] flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between text-[10px] text-gray-700 font-data">
            <span>NXXT Futures v1.0</span>
            <span>Moon Lander · Claude AI</span>
          </div>
          <button onClick={signOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0A0B0D] border border-[#1E2128] rounded-xl text-sm text-gray-500 hover:text-red-400 hover:border-red-500/20 transition-all">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────── */}
      <main className="flex-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className={activeTab === 'hot-picks'     ? 'block' : 'hidden'}><HotPicksTab /></div>
        <div className={activeTab === 'data-analysis' ? 'block' : 'hidden'}><DataAnalysisTab /></div>
        <div className={activeTab === 'journal'       ? 'block' : 'hidden'}>
          <TradingJournalTab prefillAnalysis={activeTab === 'journal' ? journalPrefill : null} />
        </div>
        <div className={activeTab === 'history'       ? 'block' : 'hidden'}>
          <TradeHistoryTab onJournalCreate={handleJournalCreate} />
        </div>
      </main>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      {/* Upgrade Modal */}
      <UpgradeModal />
    </div>
    </TierProvider>
  );
}
