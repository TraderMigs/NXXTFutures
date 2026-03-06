// src/pages/AdminPage.tsx
// NXXT Futures — God-Tier Admin Panel
// Phase 1: URL tab persistence, back arrow, demo mode, CSV on all tabs

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Navigate } from 'react-router-dom';
import {
  Users, BarChart3, Shield, Activity, Loader2, Edit2, Trash2,
  DollarSign, TrendingUp, Database, AlertCircle, Download, Search,
  X, Check, Tag, Settings, FileText, ClipboardList, Flame, Bell,
  Eye, EyeOff, Trophy, BookOpen, Gift, RefreshCw, ArrowLeft, EyeIcon,
  ChevronLeft
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
interface UserProfile {
  id: string;
  user_number: number;
  email: string;
  email_visible: boolean;
  subscription_tier: string;
  is_admin: boolean;
  bypass_stripe: boolean;
  created_at: string;
  education_completion_pct: number;
  education_badge_earned: boolean;
  education_badge_earned_at: string | null;
}

interface QuizSummary {
  user_id: string;
  user_number: number;
  email: string;
  email_visible: boolean;
  subscription_tier: string;
  education_completion_pct: number;
  education_badge_earned: boolean;
  sections_started: number;
  sections_completed: number;
  promo_sent_at: string | null;
  promo_expires_at: string | null;
  promo_redeemed: boolean;
  promo_redeemed_at: string | null;
  promo_revenue: number | null;
}

interface SystemStats {
  totalUsers: number;
  freeUsers: number;
  eliteUsers: number;
  paidUsers: number;
  admins: number;
  completedEducation: number;
  promosSent: number;
  promosRedeemed: number;
  promoRevenue: number;
}

interface AdminNotification {
  id: string;
  notification_type: string;
  user_email: string;
  message: string;
  metadata: Record<string, any>;
  read: boolean;
  created_at: string;
}

interface PromoStats {
  sent: number;
  redeemed: number;
  expired: number;
  pending: number;
  conversionRate: number;
  totalRevenue: number;
}

interface Signal {
  id: string;
  symbol: string;
  direction: string;
  confidence: number;
  status: string;
  setup_status: string;
  entry_zone_min: number;
  entry_zone_max: number;
  stop_loss: number;
  tp1: number;
  created_at: string;
  expires_at: string;
}

type TabType = 'dashboard' | 'users' | 'education' | 'signals' | 'promos' | 'revenue' | 'notifications' | 'system';

const VALID_TABS: TabType[] = ['dashboard', 'users', 'education', 'signals', 'promos', 'revenue', 'notifications', 'system'];

// ─── CSV export helper ────────────────────────────────────────
function downloadCSV(headers: string[], rows: (string | number | null | undefined)[][], filename: string) {
  const esc = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Masked email helper ──────────────────────────────────────
function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 2)}***@${domain}`;
}

// Demo-mode email: always fully masked regardless of eye toggle
function demoMaskEmail(email: string): string {
  const [, domain] = email.split('@');
  if (!domain) return 'us***@***.com';
  return `us***@${domain}`;
}

// ─── Props ────────────────────────────────────────────────────
interface AdminPageProps {
  onBack?: () => void;
}

// ─── Main component ───────────────────────────────────────────
export function AdminPage({ onBack }: AdminPageProps) {
  const { profile: authProfile, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read tab from URL on mount; default to 'dashboard'
  const urlTab = searchParams.get('admintab') as TabType | null;
  const initialTab: TabType = urlTab && VALID_TABS.includes(urlTab) ? urlTab : 'dashboard';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [demoMode, setDemoMode] = useState(false);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [quizSummary, setQuizSummary] = useState<QuizSummary[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [promoStats, setPromoStats] = useState<PromoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({
    subscription_tier: 'free',
    is_admin: false,
    bypass_stripe: false,
    email_visible: true,
  });

  const [userSearch, setUserSearch] = useState('');
  const [userTierFilter, setUserTierFilter] = useState<string>('all');
  const [signalSearch, setSignalSearch] = useState('');
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Email show/hide toggle state (local — for the admin's view per row)
  const [visibleEmails, setVisibleEmails] = useState<Set<string>>(new Set());

  // ─── Tab change: update URL ───────────────────────────────
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('admintab', tab);
      return next;
    });
  };

  useEffect(() => {
    if (authProfile?.is_admin) loadAllData();
  }, [authProfile]);

  // Sync if URL changes externally (browser back/forward)
  useEffect(() => {
    const t = searchParams.get('admintab') as TabType | null;
    if (t && VALID_TABS.includes(t) && t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        loadUsers(),
        loadQuizSummary(),
        loadSignals(),
        loadNotifications(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_number, email, email_visible, subscription_tier, is_admin, bypass_stripe, created_at, education_completion_pct, education_badge_earned, education_badge_earned_at')
      .order('user_number', { ascending: true });

    if (error) throw error;
    setUsers(data || []);

    const total = data?.length || 0;
    const free = data?.filter(u => u.subscription_tier === 'free').length || 0;
    const elite = data?.filter(u => u.subscription_tier === 'elite').length || 0;
    const admins = data?.filter(u => u.is_admin).length || 0;
    const completedEd = data?.filter(u => u.education_badge_earned).length || 0;

    setStats(prev => ({
      totalUsers: total,
      freeUsers: free,
      eliteUsers: elite,
      paidUsers: elite,
      admins,
      completedEducation: completedEd,
      promosSent: prev?.promosSent || 0,
      promosRedeemed: prev?.promosRedeemed || 0,
      promoRevenue: prev?.promoRevenue || 0,
    }));
  };

  const loadQuizSummary = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_quiz_summary')
        .select('*')
        .order('education_completion_pct', { ascending: false });

      if (error) throw error;
      setQuizSummary(data || []);

      const sent = data?.filter(u => u.promo_sent_at).length || 0;
      const redeemed = data?.filter(u => u.promo_redeemed).length || 0;
      const now = new Date();
      const expired = data?.filter(u =>
        u.promo_sent_at && !u.promo_redeemed && new Date(u.promo_expires_at || '') < now
      ).length || 0;
      const pending = sent - redeemed - expired;
      const revenue = data?.reduce((sum, u) => sum + (u.promo_revenue || 0), 0) || 0;

      setPromoStats({
        sent,
        redeemed,
        expired,
        pending,
        conversionRate: sent > 0 ? Math.round((redeemed / sent) * 100) : 0,
        totalRevenue: revenue,
      });

      setStats(prev => prev ? {
        ...prev,
        promosSent: sent,
        promosRedeemed: redeemed,
        promoRevenue: revenue,
      } : prev);

    } catch (err) {
      console.log('Quiz summary view not available yet — run Phase 1 migration first');
    }
  };

  const loadSignals = async () => {
    const { data, error } = await supabase
      .from('futures_signals')
      .select('id, symbol, direction, confidence, status, setup_status, entry_zone_min, entry_zone_max, stop_loss, tp1, created_at, expires_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    setSignals(data || []);
  };

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadNotifs(data?.filter(n => !n.read).length || 0);
    } catch (err) {
      console.log('Admin notifications table not available yet');
    }
  };

  const handleMarkAllRead = async () => {
    await supabase.from('admin_notifications').update({ read: true }).eq('read', false);
    await loadNotifications();
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({
      subscription_tier: user.subscription_tier,
      is_admin: user.is_admin,
      bypass_stripe: user.bypass_stripe,
      email_visible: user.email_visible,
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    const { error } = await supabase.from('profiles').update(editForm).eq('id', editingUser.id);
    if (error) { alert('Failed to update user'); return; }
    setEditingUser(null);
    await loadUsers();
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) { alert('Failed to delete user'); return; }
    await loadUsers();
  };

  const handleDeleteSignal = async (signalId: string) => {
    if (!confirm('Delete this signal?')) return;
    await supabase.from('futures_signals').delete().eq('id', signalId);
    await loadSignals();
  };

  const toggleEmailView = (userId: string) => {
    setVisibleEmails(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // ─── Display email — respects demo mode ──────────────────
  const displayEmail = (email: string, id: string) => {
    if (demoMode) return demoMaskEmail(email);
    const shown = visibleEmails.has(id);
    return shown ? email : maskEmail(email);
  };

  // Filter helpers
  const filteredUsers = users.filter(u => {
    const emailMatch = u.email.toLowerCase().includes(userSearch.toLowerCase());
    const tierMatch = userTierFilter === 'all' || u.subscription_tier === userTierFilter;
    return emailMatch && tierMatch;
  });

  const filteredSignals = signals.filter(s => {
    const q = signalSearch.toLowerCase();
    return s.symbol.toLowerCase().includes(q) || s.direction.toLowerCase().includes(q) || s.status.toLowerCase().includes(q);
  });

  const getTierBadge = (tier: string) => {
    if (tier === 'elite') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">Elite</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400">Free</span>;
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'bg-green-500/20 text-green-400',
      EXPIRED: 'bg-gray-500/20 text-gray-500',
      TP1_HIT: 'bg-blue-500/20 text-blue-400',
      TP2_HIT: 'bg-blue-600/20 text-blue-300',
      TP3_HIT: 'bg-purple-500/20 text-purple-400',
      STOPPED_OUT: 'bg-red-500/20 text-red-400',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] || 'bg-gray-700 text-gray-400'}`}>{status}</span>;
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
    </div>
  );

  if (!authProfile?.is_admin) return <Navigate to="/dashboard" replace />;

  const tabs = [
    { id: 'dashboard'      as TabType, label: 'Dashboard',     icon: BarChart3,     badge: null },
    { id: 'users'          as TabType, label: 'Users',          icon: Users,         badge: null },
    { id: 'education'      as TabType, label: 'Education',      icon: BookOpen,      badge: stats?.completedEducation || null },
    { id: 'signals'        as TabType, label: 'Signals',        icon: Flame,         badge: null },
    { id: 'promos'         as TabType, label: 'Promos & KPIs',  icon: Gift,          badge: null },
    { id: 'revenue'        as TabType, label: 'Revenue',        icon: DollarSign,    badge: null },
    { id: 'notifications'  as TabType, label: 'Notifications',  icon: Bell,          badge: unreadNotifs || null },
    { id: 'system'         as TabType, label: 'System',         icon: Settings,      badge: null },
  ];

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          {/* Back arrow row */}
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm mb-4 transition-colors group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to Dashboard
            </button>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Shield className="w-7 h-7 text-purple-500" />
                <h1 className="text-3xl font-bold">Admin Panel</h1>
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded-full border border-purple-500/30">NXXT Futures</span>
              </div>
              <p className="text-gray-500 text-sm">Full system control · iconmigs@gmail.com</p>
            </div>

            {/* Header action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Demo Mode toggle */}
              <button
                onClick={() => setDemoMode(d => !d)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  demoMode
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
                title="Demo Mode hides real user emails for presentations"
              >
                {demoMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {demoMode ? 'Demo ON' : 'Demo Mode'}
              </button>

              <button
                onClick={loadAllData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors border border-gray-700"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Demo mode notice */}
          {demoMode && (
            <div className="mt-3 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs flex items-center gap-2">
              <EyeOff className="w-3.5 h-3.5 flex-shrink-0" />
              Demo Mode is ON — all user emails are masked. Nothing in the database is changed. Toggle off to see real data.
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-800 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap relative ${
                    activeTab === tab.id
                      ? 'border-cyan-500 text-cyan-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge !== null && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-cyan-500 text-black text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          </div>
        ) : (
          <>

            {/* ── DASHBOARD ── */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'cyan' },
                    { label: 'Elite Traders', value: stats?.eliteUsers || 0, icon: TrendingUp, color: 'yellow' },
                    { label: 'Education Graduates', value: stats?.completedEducation || 0, icon: Trophy, color: 'amber' },
                    { label: 'Monthly Revenue', value: `$${((stats?.eliteUsers || 0) * 97).toLocaleString()}`, icon: DollarSign, color: 'green' },
                  ].map(card => {
                    const Icon = card.icon;
                    return (
                      <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            card.color === 'cyan' ? 'bg-cyan-500/20' :
                            card.color === 'yellow' ? 'bg-yellow-500/20' :
                            card.color === 'amber' ? 'bg-amber-500/20' :
                            'bg-green-500/20'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              card.color === 'cyan' ? 'text-cyan-400' :
                              card.color === 'yellow' ? 'text-yellow-400' :
                              card.color === 'amber' ? 'text-amber-400' :
                              'text-green-400'
                            }`} />
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{card.value}</div>
                            <div className="text-xs text-gray-500">{card.label}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Promo KPI quick view */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Gift className="w-5 h-5 text-green-400" />
                    <h2 className="font-bold">GRADUATE50 Promo Performance</h2>
                    <button onClick={() => handleTabChange('promos')} className="ml-auto text-xs text-cyan-400 hover:text-cyan-300">View full KPIs →</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    {[
                      { label: 'Sent', value: promoStats?.sent || 0, color: 'text-white' },
                      { label: 'Redeemed', value: promoStats?.redeemed || 0, color: 'text-green-400' },
                      { label: 'Pending', value: promoStats?.pending || 0, color: 'text-yellow-400' },
                      { label: 'Expired', value: promoStats?.expired || 0, color: 'text-gray-500' },
                      { label: 'Conversion', value: `${promoStats?.conversionRate || 0}%`, color: 'text-cyan-400' },
                    ].map(item => (
                      <div key={item.label}>
                        <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                        <div className="text-xs text-gray-500">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Unread notifications shortcut */}
                {unreadNotifs > 0 && (
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 flex items-center gap-3">
                    <Bell className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm text-cyan-400">
                      You have <strong>{unreadNotifs}</strong> unread notification{unreadNotifs > 1 ? 's' : ''}
                    </span>
                    <button onClick={() => handleTabChange('notifications')} className="ml-auto text-xs text-cyan-400 underline">
                      View →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── USERS ── */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search email..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <select
                    value={userTierFilter}
                    onChange={e => setUserTierFilter(e.target.value)}
                    className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                  >
                    <option value="all">All Tiers</option>
                    <option value="free">Free</option>
                    <option value="elite">Elite</option>
                  </select>
                  <button
                    onClick={() => downloadCSV(
                      ['#', 'Email', 'Tier', 'Education %', 'Badge', 'Admin', 'Joined'],
                      filteredUsers.map(u => [
                        u.user_number,
                        demoMode ? demoMaskEmail(u.email) : u.email,
                        u.subscription_tier,
                        u.education_completion_pct,
                        u.education_badge_earned ? 'Yes' : 'No',
                        u.is_admin ? 'Yes' : 'No',
                        new Date(u.created_at).toLocaleDateString()
                      ]),
                      'nxxt-futures-users'
                    )}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors whitespace-nowrap border border-gray-700"
                  >
                    <Download className="w-4 h-4" /> Download CSV
                  </button>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <span className="font-semibold">All Users ({filteredUsers.length})</span>
                    {!demoMode && <span className="text-xs text-gray-500">Eye icon = toggle email visibility</span>}
                    {demoMode && <span className="text-xs text-amber-400/70">Demo Mode — emails masked</span>}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800 text-left">
                          <th className="py-3 px-4 text-gray-500 text-xs font-medium">#</th>
                          <th className="py-3 px-4 text-gray-500 text-xs font-medium">Email</th>
                          <th className="py-3 px-4 text-gray-500 text-xs font-medium">Tier</th>
                          <th className="py-3 px-4 text-gray-500 text-xs font-medium">Education</th>
                          <th className="py-3 px-4 text-gray-500 text-xs font-medium">Flags</th>
                          <th className="py-3 px-4 text-gray-500 text-xs font-medium">Joined</th>
                          <th className="py-3 px-4 text-gray-500 text-xs font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(user => {
                          const emailShown = visibleEmails.has(user.id);
                          return (
                            <tr key={user.id} className="border-b border-gray-800/50 hover:bg-white/5">
                              <td className="py-3 px-4 text-gray-500 text-sm font-mono">#{demoMode ? user.user_number?.toString().slice(0, 4) + '****' : (user.user_number || '—')}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{displayEmail(user.email, user.id)}</span>
                                  {!demoMode && (
                                    <button
                                      onClick={() => toggleEmailView(user.id)}
                                      className="text-gray-600 hover:text-gray-400 transition-colors"
                                      title={emailShown ? 'Hide email' : 'Show email'}
                                    >
                                      {emailShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">{getTierBadge(user.subscription_tier)}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-1.5 rounded-full ${user.education_completion_pct === 100 ? 'bg-amber-400' : 'bg-cyan-500'}`}
                                      style={{ width: `${user.education_completion_pct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-400">{user.education_completion_pct}%</span>
                                  {user.education_badge_earned && <span className="text-sm" title="Futures Graduate">🏅</span>}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex gap-1 flex-wrap">
                                  {user.is_admin && <span className="px-1.5 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">ADMIN</span>}
                                  {user.bypass_stripe && <span className="px-1.5 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-400">BYPASS</span>}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-500 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => handleEditUser(user)} className="p-1.5 hover:bg-cyan-500/20 rounded-lg transition-colors">
                                    <Edit2 className="w-4 h-4 text-cyan-500" />
                                  </button>
                                  <button onClick={() => handleDeleteUser(user.id, user.email)} className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── EDUCATION ── */}
            {activeTab === 'education' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Started Education', value: quizSummary.filter(q => q.sections_started > 0).length, color: 'cyan' },
                    { label: 'Completed All 8', value: quizSummary.filter(q => q.education_badge_earned).length, color: 'amber' },
                    { label: 'Promos Sent', value: promoStats?.sent || 0, color: 'green' },
                    { label: 'Promos Redeemed', value: promoStats?.redeemed || 0, color: 'purple' },
                  ].map(card => (
                    <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                      <div className={`text-3xl font-bold mb-1 ${
                        card.color === 'cyan' ? 'text-cyan-400' :
                        card.color === 'amber' ? 'text-amber-400' :
                        card.color === 'green' ? 'text-green-400' :
                        'text-purple-400'
                      }`}>{card.value}</div>
                      <div className="text-xs text-gray-500">{card.label}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <span className="font-semibold">User Education Progress</span>
                    <button
                      onClick={() => downloadCSV(
                        ['#', 'Email', 'Tier', 'Completion %', 'Badge', 'Sections', 'Promo Sent', 'Promo Expires', 'Redeemed', 'Revenue'],
                        quizSummary.map(q => [
                          q.user_number,
                          demoMode ? demoMaskEmail(q.email) : q.email,
                          q.subscription_tier,
                          q.education_completion_pct,
                          q.education_badge_earned ? 'Yes' : 'No',
                          `${q.sections_completed}/8`,
                          q.promo_sent_at ? new Date(q.promo_sent_at).toLocaleDateString() : 'N/A',
                          q.promo_expires_at ? new Date(q.promo_expires_at).toLocaleDateString() : 'N/A',
                          q.promo_redeemed ? 'Yes' : 'No',
                          q.promo_revenue || 0
                        ]),
                        'nxxt-education-progress'
                      )}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors border border-gray-700"
                    >
                      <Download className="w-4 h-4" /> Download CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800 text-left">
                          <th className="py-3 px-4 text-gray-500 text-xs font-medium">#</th>
                          <th className="py-3 px-4 text-gray-500 text-xs font-medium">User</th>
                          <th className="py-3 px-4 text-gray-500 text-xs font-medium">Tier</th>
                          <th className="py-3 px-4 text-gray-500 text-xs font-medium">Progress</th>
                          <th className="py-3 px-4 text-gray-500 text-xs font-medium">Sections</th>
                          <th className="py-3 px-4 text-gray-500 text-xs font-medium">Promo Status</th>
                          <th className="py-3 px-4 text-gray-500 text-xs font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quizSummary.length === 0 ? (
                          <tr><td colSpan={7} className="py-8 text-center text-gray-500">No education data yet — users need to start the Futures Basics course.</td></tr>
                        ) : quizSummary.map(q => {
                          const emailShown = visibleEmails.has(q.user_id);
                          const promoExpired = q.promo_expires_at && new Date(q.promo_expires_at) < new Date() && !q.promo_redeemed;
                          return (
                            <tr key={q.user_id} className="border-b border-gray-800/50 hover:bg-white/5">
                              <td className="py-3 px-4 text-gray-500 text-sm font-mono">#{q.user_number || '—'}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{displayEmail(q.email, q.user_id)}</span>
                                  {!demoMode && (
                                    <button onClick={() => toggleEmailView(q.user_id)} className="text-gray-600 hover:text-gray-400">
                                      {emailShown ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">{getTierBadge(q.subscription_tier)}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-gray-800 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-2 rounded-full transition-all ${q.education_completion_pct === 100 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-cyan-500'}`}
                                      style={{ width: `${q.education_completion_pct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-400 font-mono">{q.education_completion_pct}%</span>
                                  {q.education_badge_earned && <span title="Futures Graduate">🏅</span>}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-xs text-gray-400">{q.sections_completed} / 8</td>
                              <td className="py-3 px-4">
                                {!q.promo_sent_at ? (
                                  <span className="text-xs text-gray-600">No promo yet</span>
                                ) : q.promo_redeemed ? (
                                  <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">Redeemed ✓</span>
                                ) : promoExpired ? (
                                  <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-500">Expired</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">Pending</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm font-mono text-green-400">
                                {q.promo_revenue ? `$${q.promo_revenue.toFixed(2)}` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── SIGNALS ── */}
            {activeTab === 'signals' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search symbol, direction, status..."
                      value={signalSearch}
                      onChange={e => setSignalSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                        <div className="font-bold text-green-400">{signals.filter(s => s.status === 'ACTIVE').length}</div>
                        <div className="text-xs text-gray-500">Active</div>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                        <div className="font-bold text-gray-400">{signals.filter(s => s.status === 'EXPIRED').length}</div>
                        <div className="text-xs text-gray-500">Expired</div>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                        <div className="font-bold text-blue-400">{signals.filter(s => ['TP1_HIT', 'TP2_HIT', 'TP3_HIT'].includes(s.status)).length}</div>
                        <div className="text-xs text-gray-500">TP Hits</div>
                      </div>
                    </div>
                    {/* CSV Download for Signals */}
                    <button
                      onClick={() => downloadCSV(
                        ['Symbol', 'Direction', 'Confidence', 'Status', 'Setup', 'Entry Min', 'Entry Max', 'Stop Loss', 'TP1', 'Created', 'Expires'],
                        filteredSignals.map(s => [
                          s.symbol, s.direction, s.confidence, s.status, s.setup_status,
                          s.entry_zone_min, s.entry_zone_max, s.stop_loss, s.tp1,
                          new Date(s.created_at).toLocaleString(),
                          new Date(s.expires_at).toLocaleString()
                        ]),
                        'nxxt-futures-signals'
                      )}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors whitespace-nowrap border border-gray-700"
                    >
                      <Download className="w-4 h-4" /> Download CSV
                    </button>
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-gray-800">
                    <span className="font-semibold">Signals ({filteredSignals.length})</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-left">
                          {['Symbol', 'Direction', 'Confidence', 'Entry', 'Stop', 'Status', 'Setup', 'Created', ''].map(h => (
                            <th key={h} className="py-3 px-4 text-gray-500 text-xs font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSignals.length === 0 ? (
                          <tr><td colSpan={9} className="py-8 text-center text-gray-500">No signals found</td></tr>
                        ) : filteredSignals.map(s => (
                          <tr key={s.id} className="border-b border-gray-800/50 hover:bg-white/5">
                            <td className="py-3 px-4 font-mono font-bold">{s.symbol}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {s.direction}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-300">{s.confidence}%</td>
                            <td className="py-3 px-4 font-mono text-xs">{s.entry_zone_min?.toFixed(2)}–{s.entry_zone_max?.toFixed(2)}</td>
                            <td className="py-3 px-4 font-mono text-xs text-red-400">{s.stop_loss?.toFixed(2)}</td>
                            <td className="py-3 px-4">{getStatusBadge(s.status)}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                s.setup_status === 'AT_ENTRY' ? 'bg-cyan-500/20 text-cyan-400' :
                                s.setup_status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-500/20 text-gray-500'
                              }`}>
                                {s.setup_status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs">{new Date(s.created_at).toLocaleString()}</td>
                            <td className="py-3 px-4">
                              <button onClick={() => handleDeleteSignal(s.id)} className="p-1 hover:bg-red-500/20 rounded transition-colors">
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── PROMOS & KPIs ── */}
            {activeTab === 'promos' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Total Promos Sent', value: promoStats?.sent || 0, sub: 'GRADUATE50 emails delivered', color: 'text-white' },
                    { label: 'Redeemed', value: promoStats?.redeemed || 0, sub: 'Converted to Elite', color: 'text-green-400' },
                    { label: 'Pending (unexpired)', value: promoStats?.pending || 0, sub: 'Still within 7-day window', color: 'text-yellow-400' },
                    { label: 'Expired Unused', value: promoStats?.expired || 0, sub: '7-day window passed', color: 'text-gray-500' },
                    { label: 'Conversion Rate', value: `${promoStats?.conversionRate || 0}%`, sub: 'Sent → Redeemed', color: 'text-cyan-400' },
                    { label: 'Revenue Generated', value: `$${(promoStats?.totalRevenue || 0).toFixed(2)}`, sub: 'From promo redemptions', color: 'text-green-400' },
                  ].map(card => (
                    <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                      <div className={`text-3xl font-bold mb-1 ${card.color}`}>{card.value}</div>
                      <div className="font-medium text-sm text-gray-300">{card.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{card.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Conversion funnel visual */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                    Promo Funnel
                  </h3>
                  {[
                    { label: 'Users Started Education', value: quizSummary.filter(q => q.sections_started > 0).length, max: stats?.totalUsers || 1, color: 'bg-cyan-500' },
                    { label: 'Earned Graduation Badge', value: promoStats?.sent || 0, max: stats?.totalUsers || 1, color: 'bg-amber-400' },
                    { label: 'Redeemed GRADUATE50', value: promoStats?.redeemed || 0, max: promoStats?.sent || 1, color: 'bg-green-500' },
                  ].map(row => (
                    <div key={row.label} className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{row.label}</span>
                        <span className="font-mono text-white">{row.value}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${row.color} transition-all`}
                          style={{ width: `${Math.min(100, Math.round((row.value / row.max) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-400 font-semibold mb-1">Stripe Setup Required</p>
                      <p className="text-gray-400">
                        Create a coupon code <strong className="text-white font-mono">GRADUATE50</strong> in your Stripe Dashboard (50% off first month, max 1 use per customer).
                        NXXT Futures will email it automatically when users complete Futures Basics.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── REVENUE ── */}
            {activeTab === 'revenue' && (
              <div className="space-y-6">
                {/* CSV Download for Revenue */}
                <div className="flex justify-end">
                  <button
                    onClick={() => downloadCSV(
                      ['Metric', 'Value'],
                      [
                        ['Elite Users', stats?.eliteUsers || 0],
                        ['Free Users', stats?.freeUsers || 0],
                        ['Total Users', stats?.totalUsers || 0],
                        ['MRR ($)', (stats?.eliteUsers || 0) * 97],
                        ['Promo Revenue ($)', (promoStats?.totalRevenue || 0).toFixed(2)],
                        ['Projected Annual ($)', (stats?.eliteUsers || 0) * 97 * 12],
                        ['Free-to-Elite Conversion %', stats?.totalUsers ? (((stats.eliteUsers / stats.totalUsers) * 100).toFixed(1)) : '0'],
                        ['Report Date', new Date().toLocaleDateString()],
                      ],
                      'nxxt-futures-revenue'
                    )}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors border border-gray-700"
                  >
                    <Download className="w-4 h-4" /> Download CSV
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <div className="text-sm text-gray-500 mb-2">Monthly Recurring Revenue</div>
                    <div className="text-3xl font-bold text-green-400">${((stats?.eliteUsers || 0) * 97).toLocaleString()}</div>
                    <div className="text-xs text-gray-600 mt-1">{stats?.eliteUsers || 0} Elite × $97/month</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <div className="text-sm text-gray-500 mb-2">Promo Revenue</div>
                    <div className="text-3xl font-bold text-amber-400">${(promoStats?.totalRevenue || 0).toFixed(2)}</div>
                    <div className="text-xs text-gray-600 mt-1">From GRADUATE50 redemptions</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <div className="text-sm text-gray-500 mb-2">Conversion Rate</div>
                    <div className="text-3xl font-bold text-cyan-400">
                      {stats?.totalUsers ? ((stats.eliteUsers / stats.totalUsers) * 100).toFixed(1) : 0}%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{stats?.eliteUsers || 0} paid / {stats?.totalUsers || 0} total</div>
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h2 className="font-bold mb-4">Revenue Breakdown</h2>
                  {[
                    { label: 'Free Users', count: stats?.freeUsers || 0, revenue: 0, total: stats?.totalUsers || 1, color: 'bg-gray-600' },
                    { label: 'Elite Trader ($97/mo)', count: stats?.eliteUsers || 0, revenue: (stats?.eliteUsers || 0) * 97, total: stats?.totalUsers || 1, color: 'bg-yellow-500' },
                  ].map(row => (
                    <div key={row.label} className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">{row.label}</span>
                        <span className="text-sm text-gray-400">{row.count} users · ${row.revenue.toLocaleString()}/mo</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div className={`h-2 rounded-full ${row.color}`} style={{ width: `${Math.round((row.count / row.total) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between">
                    <span className="text-gray-400">Projected Annual</span>
                    <span className="font-bold text-green-400">${((stats?.eliteUsers || 0) * 97 * 12).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── NOTIFICATIONS ── */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Admin Notifications ({unreadNotifs} unread)</span>
                  {unreadNotifs > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-cyan-400 hover:text-cyan-300 underline">
                      Mark all read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
                    No notifications yet. Notifications will appear here when users complete education, upgrade, or trigger system events.
                  </div>
                ) : notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`bg-gray-900 border rounded-xl p-4 flex items-start gap-3 ${
                      notif.read ? 'border-gray-800' : 'border-cyan-500/30 bg-cyan-500/5'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      notif.notification_type === 'quiz_completion' ? 'bg-amber-500/20' :
                      notif.notification_type === 'elite_upgrade' ? 'bg-yellow-500/20' :
                      'bg-cyan-500/20'
                    }`}>
                      {notif.notification_type === 'quiz_completion' ? '🏅' :
                       notif.notification_type === 'elite_upgrade' ? '⚡' : <Bell className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200">{notif.message}</p>
                      <p className="text-xs text-gray-600 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                    </div>
                    {!notif.read && <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0 mt-1.5" />}
                  </div>
                ))}
              </div>
            )}

            {/* ── SYSTEM ── */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h2 className="font-bold mb-4">System Information</h2>
                  <div className="space-y-3 text-sm">
                    {[
                      ['Total Users', stats?.totalUsers || 0],
                      ['Total Signals', signals.length],
                      ['Active Signals', signals.filter(s => s.status === 'ACTIVE').length],
                      ['Education Completions', stats?.completedEducation || 0],
                      ['Promos Sent', promoStats?.sent || 0],
                      ['Admin Notifications', notifications.length],
                      ['System Status', '✅ Operational'],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="flex justify-between py-2 border-b border-gray-800">
                        <span className="text-gray-400">{label}</span>
                        <span className="font-mono text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h2 className="font-bold mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={loadAllData}
                      className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                    >
                      <Database className="w-4 h-4 text-cyan-400" />
                      Refresh All Data
                    </button>
                    <button
                      onClick={() => downloadCSV(
                        ['Symbol', 'Direction', 'Confidence', 'Status', 'Setup', 'Entry Min', 'Entry Max', 'Stop Loss', 'TP1', 'Created', 'Expires'],
                        signals.map(s => [
                          s.symbol, s.direction, s.confidence, s.status, s.setup_status,
                          s.entry_zone_min, s.entry_zone_max, s.stop_loss, s.tp1,
                          new Date(s.created_at).toLocaleString(),
                          new Date(s.expires_at).toLocaleString()
                        ]),
                        'nxxt-signals'
                      )}
                      className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                    >
                      <Download className="w-4 h-4 text-green-400" />
                      Export Signals CSV
                    </button>
                    <button
                      onClick={() => downloadCSV(
                        ['#', 'Email', 'Tier', 'Education %', 'Badge', 'Admin', 'Joined'],
                        users.map(u => [
                          u.user_number,
                          demoMode ? demoMaskEmail(u.email) : u.email,
                          u.subscription_tier,
                          u.education_completion_pct,
                          u.education_badge_earned ? 'Yes' : 'No',
                          u.is_admin ? 'Yes' : 'No',
                          new Date(u.created_at).toLocaleDateString()
                        ]),
                        'nxxt-futures-all-users'
                      )}
                      className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                    >
                      <Download className="w-4 h-4 text-purple-400" />
                      Export Users CSV
                    </button>
                    <button
                      onClick={() => downloadCSV(
                        ['Metric', 'Value'],
                        [
                          ['Elite Users', stats?.eliteUsers || 0],
                          ['Free Users', stats?.freeUsers || 0],
                          ['Total Users', stats?.totalUsers || 0],
                          ['MRR ($)', (stats?.eliteUsers || 0) * 97],
                          ['Projected Annual ($)', (stats?.eliteUsers || 0) * 97 * 12],
                          ['Report Date', new Date().toLocaleDateString()],
                        ],
                        'nxxt-futures-revenue-summary'
                      )}
                      className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      Export Revenue CSV
                    </button>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-yellow-400 font-semibold mb-1">Admin Access</p>
                      <p className="text-gray-400">Full system access is active. All actions are logged. Use responsibly.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Edit User #{editingUser.user_number}</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input value={editingUser.email} disabled className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Subscription Tier</label>
                <select
                  value={editForm.subscription_tier}
                  onChange={e => setEditForm({ ...editForm, subscription_tier: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                >
                  <option value="free">Free Trader</option>
                  <option value="elite">Elite Trader</option>
                </select>
              </div>
              <div className="space-y-3 pt-2">
                {[
                  { key: 'is_admin', label: 'Is Admin', desc: 'Full admin panel access' },
                  { key: 'bypass_stripe', label: 'Bypass Stripe', desc: 'Manual Elite access without payment' },
                  { key: 'email_visible', label: 'Email Visible in Admin', desc: 'Show email unmasked by default' },
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between cursor-pointer p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={(editForm as any)[item.key]}
                      onChange={e => setEditForm({ ...editForm, [item.key]: e.target.checked })}
                      className="w-4 h-4 accent-cyan-500"
                    />
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSaveUser} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold text-sm transition-colors">
                  <Check className="w-4 h-4" /> Save Changes
                </button>
                <button onClick={() => setEditingUser(null)} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
