// src/pages/AdminPage.tsx
// NXXT Futures — Admin Panel  Phase 1 + 2 + 3 + 4
// Phase 1: URL tabs, back arrow, demo mode
// Phase 2: Support tickets tab + CSV
// Phase 3: Promo Code CRUD manager
// Phase 4: Referrals + Commissions tab

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Navigate } from 'react-router-dom';
import {
  Users, BarChart3, Shield, Loader2, Edit2, Trash2,
  DollarSign, TrendingUp, Database, AlertCircle, Download, Search,
  X, Check, Settings, Flame, Bell,
  Eye, EyeOff, Trophy, BookOpen, Gift, RefreshCw, ChevronLeft,
  MessageCircle, ChevronDown, ChevronUp, Plus, ToggleLeft, ToggleRight, Share2
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
interface UserProfile {
  id: string; user_number: number; email: string;
  subscription_tier: string; is_admin: boolean; bypass_stripe: boolean;
  created_at: string; education_completion_pct: number;
  education_badge_earned: boolean; education_badge_earned_at: string | null;
  referral_code: string | null;
}
interface QuizSummary {
  user_id: string; user_number: number; email: string;
  subscription_tier: string; education_completion_pct: number;
  education_badge_earned: boolean; sections_started: number; sections_completed: number;
  promo_sent_at: string | null; promo_expires_at: string | null;
  promo_redeemed: boolean; promo_redeemed_at: string | null; promo_revenue: number | null;
}
interface SystemStats {
  totalUsers: number; freeUsers: number; eliteUsers: number;
  admins: number; completedEducation: number; promosSent: number;
  promosRedeemed: number; promoRevenue: number;
}
interface AdminNotification {
  id: string; notification_type: string; user_email: string; message: string;
  metadata: Record<string, any>; read: boolean; created_at: string;
}
interface PromoStats {
  sent: number; redeemed: number; expired: number; pending: number;
  conversionRate: number; totalRevenue: number;
}
interface Signal {
  id: string; symbol: string; direction: string; confidence: number; status: string;
  setup_status: string; entry_zone_min: number; entry_zone_max: number;
  stop_loss: number; tp1: number; created_at: string; expires_at: string;
}
interface SupportTicket {
  id: string; created_at: string; email: string; subject: string;
  category: string; message: string; user_id: string | null;
  status: 'open' | 'in_progress' | 'resolved';
}
interface PromoCode {
  id: string; created_at: string; code: string; description: string | null;
  discount_percent: number; stripe_coupon_id: string | null;
  max_uses: number | null; uses_count: number; expires_at: string | null; active: boolean;
}
interface Referral {
  id: string; created_at: string; referrer_id: string; referrer_email?: string;
  referred_email: string; referred_id: string | null;
  status: 'pending' | 'converted' | 'cancelled'; converted_at: string | null;
}
interface Commission {
  id: string; created_at: string; referrer_id: string; referrer_email?: string;
  referred_id: string | null; referral_id: string | null;
  amount_cents: number; billing_month: string;
  status: 'pending' | 'paid' | 'cancelled'; paid_at: string | null;
}
interface StripeRevenue {
  mrr: number; arr: number; activeCount: number; pastDueCount: number;
  newThisMonth: number; canceledThisMonth: number; churnRate: number;
  sixMonthTotalDollars: number;
  monthlyRevenue: { month: string; label: string; amountCents: number; amountDollars: number }[];
  recentInvoices: { id: string; email: string; amount: number; date: string; status: string }[];
  generatedAt: string;
}

type TabType = 'dashboard' | 'users' | 'education' | 'signals' | 'promos' | 'referrals' | 'revenue' | 'notifications' | 'support' | 'system';
const VALID_TABS: TabType[] = ['dashboard','users','education','signals','promos','referrals','revenue','notifications','support','system'];

// ─── CSV helper ───────────────────────────────────────────────
function downloadCSV(headers: string[], rows: (string | number | null | undefined)[][], filename: string) {
  const esc = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g,'""')}"` : s;
  };
  const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function demoMaskEmail(email: string) {
  const [, domain] = email.split('@');
  return domain ? `us***@${domain}` : 'us***@***.com';
}

const BLANK_PROMO: Omit<PromoCode,'id'|'created_at'|'uses_count'> = {
  code: '', description: '', discount_percent: 50,
  stripe_coupon_id: '', max_uses: null, expires_at: null, active: true,
};

interface AdminPageProps { onBack?: () => void; }

// ─── Main ─────────────────────────────────────────────────────
export function AdminPage({ onBack }: AdminPageProps) {
  const { profile: authProfile, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlTab = searchParams.get('admintab') as TabType | null;
  const initialTab: TabType = urlTab && VALID_TABS.includes(urlTab) ? urlTab : 'dashboard';

  const [activeTab,        setActiveTab]        = useState<TabType>(initialTab);
  const [demoMode,         setDemoMode]         = useState(false);
  const [users,            setUsers]            = useState<UserProfile[]>([]);
  const [quizSummary,      setQuizSummary]      = useState<QuizSummary[]>([]);
  const [signals,          setSignals]          = useState<Signal[]>([]);
  const [notifications,    setNotifications]    = useState<AdminNotification[]>([]);
  const [tickets,          setTickets]          = useState<SupportTicket[]>([]);
  const [promoCodes,       setPromoCodes]       = useState<PromoCode[]>([]);
  const [referrals,        setReferrals]        = useState<Referral[]>([]);
  const [commissions,      setCommissions]      = useState<Commission[]>([]);
  const [stats,            setStats]            = useState<SystemStats | null>(null);
  const [promoStats,       setPromoStats]       = useState<PromoStats | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');

  // User edit modal
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ subscription_tier: 'free', is_admin: false, bypass_stripe: false });

  // Promo code modal
  const [showPromoModal,  setShowPromoModal]  = useState(false);
  const [editingPromo,    setEditingPromo]    = useState<PromoCode | null>(null);
  const [promoForm,       setPromoForm]       = useState<typeof BLANK_PROMO>({ ...BLANK_PROMO });
  const [promoSaving,     setPromoSaving]     = useState(false);
  const [promoFormError,  setPromoFormError]  = useState('');

  // Filters
  const [userSearch,       setUserSearch]       = useState('');
  const [userTierFilter,   setUserTierFilter]   = useState<string>('all');
  const [signalSearch,     setSignalSearch]     = useState('');
  const [unreadNotifs,     setUnreadNotifs]     = useState(0);
  const [ticketFilter,     setTicketFilter]     = useState<string>('all');
  const [expandedTicket,   setExpandedTicket]   = useState<string | null>(null);
  const [updatingTicket,   setUpdatingTicket]   = useState<string | null>(null);
  const [openTicketCount,  setOpenTicketCount]  = useState(0);
  const [commissionFilter, setCommissionFilter] = useState<string>('all');
  const [updatingCommId,   setUpdatingCommId]   = useState<string | null>(null);

  // Stripe Revenue (Phase 5)
  const [stripeRevenue,   setStripeRevenue]   = useState<StripeRevenue | null>(null);
  const [stripeLoading,   setStripeLoading]   = useState(false);
  const [stripeError,     setStripeError]     = useState('');

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('admintab', tab); return n; });
  };

  useEffect(() => { if (authProfile?.is_admin) loadAllData(); }, [authProfile]);
  useEffect(() => {
    const t = searchParams.get('admintab') as TabType | null;
    if (t && VALID_TABS.includes(t) && t !== activeTab) setActiveTab(t);
  }, [searchParams]);

  const loadAllData = async () => {
    setLoading(true); setError('');
    try { await Promise.all([loadUsers(), loadQuizSummary(), loadSignals(), loadNotifications(), loadTickets(), loadPromoCodes(), loadReferrals()]); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load admin data'); }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    const { data, error } = await supabase.from('profiles')
      .select('id,user_number,email,subscription_tier,is_admin,bypass_stripe,created_at,education_completion_pct,education_badge_earned,education_badge_earned_at,referral_code')
      .order('user_number', { ascending: true });
    if (error) throw error;
    setUsers(data || []);
    setStats(prev => ({
      totalUsers:         data?.length || 0,
      freeUsers:          data?.filter(u => u.subscription_tier === 'free').length || 0,
      eliteUsers:         data?.filter(u => u.subscription_tier === 'elite').length || 0,
      admins:             data?.filter(u => u.is_admin).length || 0,
      completedEducation: data?.filter(u => u.education_badge_earned).length || 0,
      promosSent:    prev?.promosSent || 0,
      promosRedeemed: prev?.promosRedeemed || 0,
      promoRevenue:  prev?.promoRevenue || 0,
    }));
  };

  const loadQuizSummary = async () => {
    try {
      const { data } = await supabase.from('admin_quiz_summary').select('*').order('education_completion_pct', { ascending: false });
      setQuizSummary(data || []);
      const sent = data?.filter(u => u.promo_sent_at).length || 0;
      const redeemed = data?.filter(u => u.promo_redeemed).length || 0;
      const now = new Date();
      const expired = data?.filter(u => u.promo_sent_at && !u.promo_redeemed && new Date(u.promo_expires_at || '') < now).length || 0;
      const revenue = data?.reduce((s, u) => s + (u.promo_revenue || 0), 0) || 0;
      setPromoStats({ sent, redeemed, expired, pending: sent - redeemed - expired, conversionRate: sent > 0 ? Math.round((redeemed / sent) * 100) : 0, totalRevenue: revenue });
      setStats(prev => prev ? { ...prev, promosSent: sent, promosRedeemed: redeemed, promoRevenue: revenue } : prev);
    } catch { console.log('Quiz summary not ready'); }
  };

  const loadSignals = async () => {
    const { data } = await supabase.from('futures_signals')
      .select('id,symbol,direction,confidence,status,setup_status,entry_zone_min,entry_zone_max,stop_loss,tp1,created_at,expires_at')
      .order('created_at', { ascending: false }).limit(200);
    setSignals(data || []);
  };

  const loadNotifications = async () => {
    try {
      const { data } = await supabase.from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(50);
      setNotifications(data || []);
      setUnreadNotifs(data?.filter(n => !n.read).length || 0);
    } catch { console.log('Admin notifications not ready'); }
  };

  const loadTickets = async () => {
    try {
      const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
      setTickets(data || []);
      setOpenTicketCount(data?.filter(t => t.status === 'open').length || 0);
    } catch { console.log('Support tickets not ready'); }
  };

  const loadPromoCodes = async () => {
    try {
      const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
      setPromoCodes(data || []);
    } catch { console.log('promo_codes not ready'); }
  };

  const loadReferrals = async () => {
    try {
      // Join referrals with profiles to get referrer email
      const { data: refs } = await supabase
        .from('referrals')
        .select('id, created_at, referrer_id, referred_email, referred_id, status, converted_at')
        .order('created_at', { ascending: false });

      const { data: comms } = await supabase
        .from('referral_commissions')
        .select('id, created_at, referrer_id, referred_id, referral_id, amount_cents, billing_month, status, paid_at')
        .order('created_at', { ascending: false });

      // Enrich with referrer emails using loaded users
      const userMap: Record<string, string> = {};
      users.forEach(u => { userMap[u.id] = u.email; });

      setReferrals((refs || []).map(r => ({ ...r, referrer_email: userMap[r.referrer_id] })));
      setCommissions((comms || []).map(c => ({ ...c, referrer_email: userMap[c.referrer_id] })));
    } catch { console.log('Referral tables not ready — run Phase 4 SQL'); }
  };

  // ─── Promo CRUD ───────────────────────────────────────────
  const openCreatePromo = () => { setEditingPromo(null); setPromoForm({ ...BLANK_PROMO }); setPromoFormError(''); setShowPromoModal(true); };
  const openEditPromo = (p: PromoCode) => {
    setEditingPromo(p);
    setPromoForm({ code: p.code, description: p.description ?? '', discount_percent: p.discount_percent, stripe_coupon_id: p.stripe_coupon_id ?? '', max_uses: p.max_uses, expires_at: p.expires_at ? p.expires_at.slice(0, 10) : null, active: p.active });
    setPromoFormError(''); setShowPromoModal(true);
  };
  const handleSavePromo = async () => {
    setPromoFormError('');
    if (!promoForm.code.trim()) { setPromoFormError('Code is required.'); return; }
    if (promoForm.discount_percent < 1 || promoForm.discount_percent > 100) { setPromoFormError('Discount must be 1–100%.'); return; }
    setPromoSaving(true);
    try {
      const payload = { code: promoForm.code.trim().toUpperCase(), description: promoForm.description?.trim() || null, discount_percent: promoForm.discount_percent, stripe_coupon_id: promoForm.stripe_coupon_id?.trim() || null, max_uses: promoForm.max_uses, expires_at: promoForm.expires_at ? new Date(promoForm.expires_at).toISOString() : null, active: promoForm.active };
      if (editingPromo) { const { error } = await supabase.from('promo_codes').update(payload).eq('id', editingPromo.id); if (error) throw error; }
      else { const { error } = await supabase.from('promo_codes').insert({ ...payload, uses_count: 0 }); if (error) throw error; }
      setShowPromoModal(false); await loadPromoCodes();
    } catch (err) { setPromoFormError(err instanceof Error ? err.message : 'Failed to save.'); }
    finally { setPromoSaving(false); }
  };
  const handleTogglePromoActive = async (p: PromoCode) => {
    const { error } = await supabase.from('promo_codes').update({ active: !p.active }).eq('id', p.id);
    if (!error) setPromoCodes(prev => prev.map(c => c.id === p.id ? { ...c, active: !c.active } : c));
  };
  const handleDeletePromo = async (p: PromoCode) => {
    if (!confirm(`Delete promo code "${p.code}"?`)) return;
    const { error } = await supabase.from('promo_codes').delete().eq('id', p.id);
    if (!error) setPromoCodes(prev => prev.filter(c => c.id !== p.id));
  };

  // ─── Commission actions ───────────────────────────────────
  // ─── Stripe Revenue Loader ────────────────────────────────
  const loadStripeRevenue = async () => {
    setStripeLoading(true);
    setStripeError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await supabase.functions.invoke('stripe-revenue', {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (resp.error) throw new Error(resp.error.message || 'Edge function error');
      setStripeRevenue(resp.data);
    } catch (err) {
      setStripeError(err instanceof Error ? err.message : 'Failed to load Stripe data');
    } finally {
      setStripeLoading(false);
    }
  };

  const handleUpdateCommissionStatus = async (id: string, newStatus: 'pending' | 'paid' | 'cancelled') => {
    setUpdatingCommId(id);
    const patch: any = { status: newStatus };
    if (newStatus === 'paid') patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from('referral_commissions').update(patch).eq('id', id);
    if (!error) setCommissions(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    setUpdatingCommId(null);
  };

  // ─── Other handlers ───────────────────────────────────────
  const handleUpdateTicketStatus = async (ticketId: string, newStatus: 'open' | 'in_progress' | 'resolved') => {
    setUpdatingTicket(ticketId);
    const { error } = await supabase.from('support_tickets').update({ status: newStatus }).eq('id', ticketId);
    if (!error) setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    setUpdatingTicket(null);
  };
  const handleMarkAllRead = async () => { await supabase.from('admin_notifications').update({ read: true }).eq('read', false); await loadNotifications(); };
  const handleEditUser = (user: UserProfile) => { setEditingUser(user); setEditForm({ subscription_tier: user.subscription_tier, is_admin: user.is_admin, bypass_stripe: user.bypass_stripe }); };
  const handleSaveUser = async () => { if (!editingUser) return; await supabase.from('profiles').update(editForm).eq('id', editingUser.id); setEditingUser(null); await loadUsers(); };
  const handleDeleteUser = async (userId: string, email: string) => { if (!confirm(`Delete user ${email}?`)) return; await supabase.from('profiles').delete().eq('id', userId); await loadUsers(); };
  const handleDeleteSignal = async (signalId: string) => { if (!confirm('Delete this signal?')) return; await supabase.from('futures_signals').delete().eq('id', signalId); await loadSignals(); };

  // ─── Derived ──────────────────────────────────────────────
  const showEmail = (email: string | undefined) => (!email ? '—' : demoMode ? demoMaskEmail(email) : email);
  const filteredUsers   = users.filter(u => u.email.toLowerCase().includes(userSearch.toLowerCase()) && (userTierFilter === 'all' || u.subscription_tier === userTierFilter));
  const filteredSignals = signals.filter(s => { const q = signalSearch.toLowerCase(); return s.symbol.toLowerCase().includes(q) || s.direction.toLowerCase().includes(q) || s.status.toLowerCase().includes(q); });
  const filteredTickets = tickets.filter(t => ticketFilter === 'all' || t.status === ticketFilter);
  const filteredCommissions = commissions.filter(c => commissionFilter === 'all' || c.status === commissionFilter);

  const totalPendingComm = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount_cents, 0);
  const totalPaidComm    = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount_cents, 0);
  const now        = new Date();
  const fmtDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const getTierBadge = (tier: string) => tier === 'elite'
    ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">Elite</span>
    : <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400">Free</span>;

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { ACTIVE: 'bg-green-500/20 text-green-400', EXPIRED: 'bg-gray-500/20 text-gray-500', TP1_HIT: 'bg-blue-500/20 text-blue-400', TP2_HIT: 'bg-blue-600/20 text-blue-300', TP3_HIT: 'bg-purple-500/20 text-purple-400', STOPPED_OUT: 'bg-red-500/20 text-red-400' };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] || 'bg-gray-700 text-gray-400'}`}>{status}</span>;
  };
  const getTicketStatusBadge = (s: string) => {
    if (s === 'open')        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">Open</span>;
    if (s === 'in_progress') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">In Progress</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">Resolved</span>;
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>;
  if (!authProfile?.is_admin) return <Navigate to="/dashboard" replace />;

  const tabs = [
    { id: 'dashboard'     as TabType, label: 'Dashboard',    icon: BarChart3,     badge: null },
    { id: 'users'         as TabType, label: 'Users',         icon: Users,         badge: null },
    { id: 'education'     as TabType, label: 'Education',     icon: BookOpen,      badge: null },
    { id: 'signals'       as TabType, label: 'Signals',       icon: Flame,         badge: null },
    { id: 'promos'        as TabType, label: 'Promos',        icon: Gift,          badge: null },
    { id: 'referrals'     as TabType, label: 'Referrals',     icon: Share2,        badge: referrals.filter(r => r.status === 'converted').length || null },
    { id: 'revenue'       as TabType, label: 'Revenue',       icon: DollarSign,    badge: null },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell,          badge: unreadNotifs || null },
    { id: 'support'       as TabType, label: 'Support',       icon: MessageCircle, badge: openTicketCount || null },
    { id: 'system'        as TabType, label: 'System',        icon: Settings,      badge: null },
  ];

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm mb-4 transition-colors group">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Dashboard
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
            <div className="flex items-center gap-2">
              <button onClick={() => setDemoMode(d => !d)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${demoMode ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
                {demoMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {demoMode ? 'Demo ON' : 'Demo Mode'}
              </button>
              <button onClick={loadAllData} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors border border-gray-700">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>
          </div>
          {demoMode && <div className="mt-3 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs flex items-center gap-2"><EyeOff className="w-3.5 h-3.5 flex-shrink-0" />Demo Mode — all emails masked</div>}
        </div>

        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-800 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap relative ${activeTab === tab.id ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-white'}`}>
                  <Icon className="w-4 h-4" />{tab.label}
                  {tab.badge !== null && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-cyan-500 text-black text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">{tab.badge > 9 ? '9+' : tab.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div> : (
          <>

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users',   value: stats?.totalUsers || 0,                                  icon: Users,      color: 'cyan'   },
                  { label: 'Elite Traders', value: stats?.eliteUsers || 0,                                  icon: TrendingUp, color: 'yellow' },
                  { label: 'Graduates',     value: stats?.completedEducation || 0,                          icon: Trophy,     color: 'amber'  },
                  { label: 'MRR',           value: `$${((stats?.eliteUsers || 0) * 97).toLocaleString()}`,  icon: DollarSign, color: 'green'  },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${card.color === 'cyan' ? 'bg-cyan-500/20' : card.color === 'yellow' ? 'bg-yellow-500/20' : card.color === 'amber' ? 'bg-amber-500/20' : 'bg-green-500/20'}`}>
                          <Icon className={`w-5 h-5 ${card.color === 'cyan' ? 'text-cyan-400' : card.color === 'yellow' ? 'text-yellow-400' : card.color === 'amber' ? 'text-amber-400' : 'text-green-400'}`} />
                        </div>
                        <div><div className="text-2xl font-bold">{card.value}</div><div className="text-xs text-gray-500">{card.label}</div></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Promo Codes',     count: promoCodes.filter(p => p.active).length, sub: `${promoCodes.length} total`,                icon: Gift,          tab: 'promos'    as TabType, color: 'text-green-400'  },
                  { label: 'Referrals',        count: referrals.filter(r => r.status === 'converted').length, sub: `${referrals.length} total signups`, icon: Share2, tab: 'referrals' as TabType, color: 'text-cyan-400'   },
                  { label: 'Pending Payouts',  count: fmtDollars(totalPendingComm), sub: `${fmtDollars(totalPaidComm)} paid out`,              icon: DollarSign,    tab: 'referrals' as TabType, color: 'text-amber-400'  },
                  { label: 'Open Tickets',     count: tickets.filter(t => t.status === 'open').length, sub: `${tickets.length} total`,           icon: MessageCircle, tab: 'support'   as TabType, color: 'text-red-400'    },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2"><Icon className={`w-4 h-4 ${card.color}`} /><span className="font-semibold text-sm">{card.label}</span><button onClick={() => handleTabChange(card.tab)} className="ml-auto text-xs text-cyan-400">→</button></div>
                      <div className={`text-2xl font-bold ${card.color}`}>{card.count}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{card.sub}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input type="text" placeholder="Search email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" /></div>
                <select value={userTierFilter} onChange={e => setUserTierFilter(e.target.value)} className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"><option value="all">All Tiers</option><option value="free">Free</option><option value="elite">Elite</option></select>
                <button onClick={() => downloadCSV(['#','Email','Tier','Education %','Badge','Referral Code','Admin','Joined'], filteredUsers.map(u => [u.user_number, showEmail(u.email), u.subscription_tier, u.education_completion_pct, u.education_badge_earned ? 'Yes' : 'No', u.referral_code || '', u.is_admin ? 'Yes' : 'No', new Date(u.created_at).toLocaleDateString()]), 'nxxt-futures-users')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors whitespace-nowrap border border-gray-700"><Download className="w-4 h-4" /> CSV</button>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between"><span className="font-semibold">All Users ({filteredUsers.length})</span>{demoMode && <span className="text-xs text-amber-400/70">Demo Mode</span>}</div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-gray-800 text-left">{['#','Email','Tier','Education','Ref Code','Flags','Joined','Actions'].map(h => <th key={h} className={`py-3 px-4 text-gray-500 text-xs font-medium ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="border-b border-gray-800/50 hover:bg-white/5">
                          <td className="py-3 px-4 text-gray-500 text-sm font-mono">#{user.user_number || '—'}</td>
                          <td className="py-3 px-4 text-sm">{showEmail(user.email)}</td>
                          <td className="py-3 px-4">{getTierBadge(user.subscription_tier)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-800 rounded-full h-1.5 overflow-hidden"><div className={`h-1.5 rounded-full ${user.education_completion_pct === 100 ? 'bg-amber-400' : 'bg-cyan-500'}`} style={{ width: `${user.education_completion_pct}%` }} /></div>
                              <span className="text-xs text-gray-400">{user.education_completion_pct}%</span>
                              {user.education_badge_earned && <span>🏅</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-green-400">{user.referral_code || '—'}</td>
                          <td className="py-3 px-4"><div className="flex gap-1">{user.is_admin && <span className="px-1.5 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">ADMIN</span>}{user.bypass_stripe && <span className="px-1.5 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-400">BYPASS</span>}</div></td>
                          <td className="py-3 px-4 text-gray-500 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => handleEditUser(user)} className="p-1.5 hover:bg-cyan-500/20 rounded-lg"><Edit2 className="w-4 h-4 text-cyan-500" /></button>
                              <button onClick={() => handleDeleteUser(user.id, user.email)} className="p-1.5 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
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
                  { label: 'Started', value: quizSummary.filter(q => q.sections_started > 0).length, color: 'text-cyan-400' },
                  { label: 'Completed All 8', value: quizSummary.filter(q => q.education_badge_earned).length, color: 'text-amber-400' },
                  { label: 'Promos Sent', value: promoStats?.sent || 0, color: 'text-green-400' },
                  { label: 'Promos Redeemed', value: promoStats?.redeemed || 0, color: 'text-purple-400' },
                ].map(card => <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center"><div className={`text-3xl font-bold mb-1 ${card.color}`}>{card.value}</div><div className="text-xs text-gray-500">{card.label}</div></div>)}
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <span className="font-semibold">Education Progress</span>
                  <button onClick={() => downloadCSV(['#','Email','Tier','Completion %','Badge','Sections','Promo Sent','Redeemed'], quizSummary.map(q => [q.user_number, showEmail(q.email), q.subscription_tier, q.education_completion_pct, q.education_badge_earned ? 'Yes' : 'No', `${q.sections_completed}/8`, q.promo_sent_at ? new Date(q.promo_sent_at).toLocaleDateString() : 'N/A', q.promo_redeemed ? 'Yes' : 'No']), 'nxxt-education')} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 border border-gray-700"><Download className="w-4 h-4" /> CSV</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-gray-800 text-left">{['#','User','Tier','Progress','Sections','Promo Status'].map(h => <th key={h} className="py-3 px-4 text-gray-500 text-xs font-medium">{h}</th>)}</tr></thead>
                    <tbody>
                      {quizSummary.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-gray-500">No education data yet.</td></tr>
                        : quizSummary.map(q => {
                          const promoExpired = q.promo_expires_at && new Date(q.promo_expires_at) < new Date() && !q.promo_redeemed;
                          return (
                            <tr key={q.user_id} className="border-b border-gray-800/50 hover:bg-white/5">
                              <td className="py-3 px-4 text-gray-500 text-sm font-mono">#{q.user_number || '—'}</td>
                              <td className="py-3 px-4 text-sm">{showEmail(q.email)}</td>
                              <td className="py-3 px-4">{getTierBadge(q.subscription_tier)}</td>
                              <td className="py-3 px-4"><div className="flex items-center gap-2"><div className="w-20 bg-gray-800 rounded-full h-2 overflow-hidden"><div className={`h-2 rounded-full ${q.education_completion_pct === 100 ? 'bg-amber-400' : 'bg-cyan-500'}`} style={{ width: `${q.education_completion_pct}%` }} /></div><span className="text-xs text-gray-400">{q.education_completion_pct}%</span>{q.education_badge_earned && <span>🏅</span>}</div></td>
                              <td className="py-3 px-4 text-xs text-gray-400">{q.sections_completed}/8</td>
                              <td className="py-3 px-4">{!q.promo_sent_at ? <span className="text-xs text-gray-600">—</span> : q.promo_redeemed ? <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">Redeemed ✓</span> : promoExpired ? <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-500">Expired</span> : <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">Pending</span>}</td>
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
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input type="text" placeholder="Search symbol, direction, status..." value={signalSearch} onChange={e => setSignalSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" /></div>
                <button onClick={() => downloadCSV(['Symbol','Direction','Confidence','Status','Setup','Entry Min','Entry Max','Stop','TP1','Created'], filteredSignals.map(s => [s.symbol, s.direction, s.confidence, s.status, s.setup_status, s.entry_zone_min, s.entry_zone_max, s.stop_loss, s.tp1, new Date(s.created_at).toLocaleString()]), 'nxxt-signals')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 border border-gray-700"><Download className="w-4 h-4" /> CSV</button>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800"><span className="font-semibold">Signals ({filteredSignals.length})</span></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-800 text-left">{['Symbol','Direction','Confidence','Entry','Stop','Status','Setup','Created',''].map(h => <th key={h} className="py-3 px-4 text-gray-500 text-xs font-medium">{h}</th>)}</tr></thead>
                    <tbody>
                      {filteredSignals.length === 0 ? <tr><td colSpan={9} className="py-8 text-center text-gray-500">No signals found</td></tr>
                        : filteredSignals.map(s => (
                          <tr key={s.id} className="border-b border-gray-800/50 hover:bg-white/5">
                            <td className="py-3 px-4 font-mono font-bold">{s.symbol}</td>
                            <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded text-xs font-medium ${s.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{s.direction}</span></td>
                            <td className="py-3 px-4">{s.confidence}%</td>
                            <td className="py-3 px-4 font-mono text-xs">{s.entry_zone_min?.toFixed(2)}–{s.entry_zone_max?.toFixed(2)}</td>
                            <td className="py-3 px-4 font-mono text-xs text-red-400">{s.stop_loss?.toFixed(2)}</td>
                            <td className="py-3 px-4">{getStatusBadge(s.status)}</td>
                            <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded text-xs font-medium ${s.setup_status === 'AT_ENTRY' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{s.setup_status}</span></td>
                            <td className="py-3 px-4 text-gray-500 text-xs">{new Date(s.created_at).toLocaleString()}</td>
                            <td className="py-3 px-4"><button onClick={() => handleDeleteSignal(s.id)} className="p-1 hover:bg-red-500/20 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button></td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── PROMOS ── */}
          {activeTab === 'promos' && (
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between flex-wrap gap-3">
                  <div><span className="font-semibold">Promo Codes</span><span className="ml-2 text-xs text-gray-500">{promoCodes.length} total · {promoCodes.filter(p => p.active).length} active</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => downloadCSV(['Code','Description','Discount %','Max Uses','Used','Expires','Active'], promoCodes.map(p => [p.code, p.description || '', p.discount_percent, p.max_uses ?? 'Unlimited', p.uses_count, p.expires_at ? new Date(p.expires_at).toLocaleDateString() : 'Never', p.active ? 'Yes' : 'No']), 'nxxt-promo-codes')} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 border border-gray-700"><Download className="w-4 h-4" /> CSV</button>
                    <button onClick={openCreatePromo} className="flex items-center gap-2 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm text-white font-semibold"><Plus className="w-4 h-4" /> New Code</button>
                  </div>
                </div>
                {promoCodes.length === 0 ? (
                  <div className="p-12 text-center text-gray-500"><Gift className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No promo codes yet. Click "New Code" to create one.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-800 text-left">{['Code','Description','Discount','Uses','Expires','Status','Actions'].map(h => <th key={h} className={`py-3 px-4 text-gray-500 text-xs font-medium ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
                      <tbody>
                        {promoCodes.map(p => {
                          const isExpired = p.expires_at && new Date(p.expires_at) < new Date();
                          const isMaxed   = p.max_uses !== null && p.uses_count >= p.max_uses;
                          return (
                            <tr key={p.id} className="border-b border-gray-800/50 hover:bg-white/5">
                              <td className="py-3 px-4 font-mono font-bold text-white">{p.code}</td>
                              <td className="py-3 px-4 text-gray-400 text-xs max-w-[160px] truncate">{p.description || <span className="text-gray-600">—</span>}</td>
                              <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">{p.discount_percent}% off</span></td>
                              <td className="py-3 px-4"><span className={isMaxed ? 'text-red-400' : 'text-gray-300'}>{p.uses_count}{p.max_uses !== null ? `/${p.max_uses}` : ''}</span></td>
                              <td className="py-3 px-4 text-xs text-gray-500">{p.expires_at ? <span className={isExpired ? 'text-red-400' : 'text-gray-400'}>{new Date(p.expires_at).toLocaleDateString()}</span> : <span className="text-gray-600">Never</span>}</td>
                              <td className="py-3 px-4"><button onClick={() => handleTogglePromoActive(p)} className="flex items-center gap-1.5 text-xs hover:opacity-80">{p.active ? <><ToggleRight className="w-4 h-4 text-green-400" /><span className="text-green-400">Active</span></> : <><ToggleLeft className="w-4 h-4 text-gray-500" /><span className="text-gray-500">Inactive</span></>}</button></td>
                              <td className="py-3 px-4 text-right"><div className="flex justify-end gap-1"><button onClick={() => openEditPromo(p)} className="p-1.5 hover:bg-cyan-500/20 rounded-lg"><Edit2 className="w-3.5 h-3.5 text-cyan-500" /></button><button onClick={() => handleDeletePromo(p)} className="p-1.5 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button></div></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-400 font-semibold mb-1">Stripe Coupon Required</p>
                  <p className="text-gray-400 text-xs">Create the matching coupon at <a href="https://dashboard.stripe.com/coupons" target="_blank" rel="noreferrer" className="text-amber-400 underline">Stripe Dashboard → Coupons</a>, then paste the Coupon ID into the promo code form. Without this, the discount won't apply at Stripe checkout.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── REFERRALS ── */}
          {activeTab === 'referrals' && (
            <div className="space-y-6">

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Sign-ups',  value: referrals.length,                                            color: 'text-white'     },
                  { label: 'Converted Elite', value: referrals.filter(r => r.status === 'converted').length,       color: 'text-green-400' },
                  { label: 'Pending Payout',  value: fmtDollars(totalPendingComm),                                 color: 'text-amber-400' },
                  { label: 'Total Paid Out',  value: fmtDollars(totalPaidComm),                                    color: 'text-cyan-400'  },
                ].map(card => <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center"><div className={`text-2xl font-bold mb-1 ${card.color}`}>{card.value}</div><div className="text-xs text-gray-500">{card.label}</div></div>)}
              </div>

              {/* Referrals table */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between flex-wrap gap-3">
                  <span className="font-semibold">Referrals ({referrals.length})</span>
                  <button onClick={() => downloadCSV(['Date','Referrer','Referred Email','Status','Converted At'], referrals.map(r => [new Date(r.created_at).toLocaleDateString(), showEmail(r.referrer_email), showEmail(r.referred_email), r.status, r.converted_at ? new Date(r.converted_at).toLocaleDateString() : '—']), 'nxxt-referrals')} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 border border-gray-700"><Download className="w-4 h-4" /> CSV</button>
                </div>
                {referrals.length === 0 ? (
                  <div className="p-12 text-center text-gray-500"><Share2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No referrals yet. They appear when users sign up via a referral link.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-800 text-left">{['Date','Referrer','Referred','Status','Converted'].map(h => <th key={h} className="py-3 px-4 text-gray-500 text-xs font-medium">{h}</th>)}</tr></thead>
                      <tbody>
                        {referrals.map(r => (
                          <tr key={r.id} className="border-b border-gray-800/50 hover:bg-white/5">
                            <td className="py-3 px-4 text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                            <td className="py-3 px-4 text-sm">{showEmail(r.referrer_email)}</td>
                            <td className="py-3 px-4 text-sm">{showEmail(r.referred_email)}</td>
                            <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === 'converted' ? 'bg-green-500/20 text-green-400' : r.status === 'cancelled' ? 'bg-gray-500/20 text-gray-500' : 'bg-amber-500/20 text-amber-400'}`}>{r.status === 'converted' ? 'Converted ✓' : r.status === 'cancelled' ? 'Cancelled' : 'Pending'}</span></td>
                            <td className="py-3 px-4 text-gray-500 text-xs">{r.converted_at ? new Date(r.converted_at).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Commissions table */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">Commissions ({filteredCommissions.length})</span>
                    <select value={commissionFilter} onChange={e => setCommissionFilter(e.target.value)} className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs">
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <button onClick={() => downloadCSV(['Date','Referrer','Month','Amount','Status','Paid At'], filteredCommissions.map(c => [new Date(c.created_at).toLocaleDateString(), showEmail(c.referrer_email), c.billing_month, fmtDollars(c.amount_cents), c.status, c.paid_at ? new Date(c.paid_at).toLocaleDateString() : '—']), 'nxxt-commissions')} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 border border-gray-700"><Download className="w-4 h-4" /> CSV</button>
                </div>
                {filteredCommissions.length === 0 ? (
                  <div className="p-12 text-center text-gray-500"><DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No commissions yet. They're created automatically when referred users pay monthly.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-800 text-left">{['Date','Referrer','Month','Amount','Status','Actions'].map(h => <th key={h} className={`py-3 px-4 text-gray-500 text-xs font-medium ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredCommissions.map(c => (
                          <tr key={c.id} className="border-b border-gray-800/50 hover:bg-white/5">
                            <td className="py-3 px-4 text-gray-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                            <td className="py-3 px-4 text-sm">{showEmail(c.referrer_email)}</td>
                            <td className="py-3 px-4 font-mono text-xs text-gray-300">{c.billing_month}</td>
                            <td className="py-3 px-4 font-bold text-green-400">{fmtDollars(c.amount_cents)}</td>
                            <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded text-xs font-medium ${c.status === 'paid' ? 'bg-green-500/20 text-green-400' : c.status === 'cancelled' ? 'bg-gray-500/20 text-gray-500' : 'bg-amber-500/20 text-amber-400'}`}>{c.status === 'paid' ? 'Paid ✓' : c.status === 'cancelled' ? 'Cancelled' : 'Pending'}</span></td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-1">
                                {c.status === 'pending' && <button onClick={() => handleUpdateCommissionStatus(c.id, 'paid')} disabled={updatingCommId === c.id} className="px-2.5 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs disabled:opacity-40">{updatingCommId === c.id ? '…' : 'Mark Paid'}</button>}
                                {c.status === 'pending' && <button onClick={() => handleUpdateCommissionStatus(c.id, 'cancelled')} disabled={updatingCommId === c.id} className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded text-xs disabled:opacity-40">Cancel</button>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-cyan-400 font-semibold mb-1">Commissions are manual</p>
                  <p className="text-gray-400 text-xs">$25 commissions are auto-created each billing month when a referred user pays. You mark them as "Paid" here after you've sent payment to the referrer via PayPal, Wise, or crypto. Use the CSV export to track all payouts.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── REVENUE ── */}
          {activeTab === 'revenue' && (() => {
            const rev = stripeRevenue;
            const maxBar = rev ? Math.max(...rev.monthlyRevenue.map(m => m.amountDollars), 1) : 1;
            return (
              <div className="space-y-6">

                {/* Load button */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Live Stripe Revenue</h2>
                    {rev && <p className="text-xs text-gray-600 mt-0.5">Updated {new Date(rev.generatedAt).toLocaleTimeString()}</p>}
                  </div>
                  <button
                    onClick={loadStripeRevenue}
                    disabled={stripeLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-xl text-sm font-semibold text-white transition-all"
                  >
                    {stripeLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Loading…</> : <><RefreshCw className="w-4 h-4" />Pull from Stripe</>}
                  </button>
                </div>

                {stripeError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{stripeError}
                  </div>
                )}

                {!rev && !stripeLoading && !stripeError && (
                  <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-12 text-center">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                    <p className="text-gray-400 font-semibold mb-1">Click "Pull from Stripe" to load live data</p>
                    <p className="text-xs text-gray-600">Fetches real subscriptions, invoices, MRR and ARR directly from your Stripe account.</p>
                  </div>
                )}

                {stripeLoading && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                    <p className="text-gray-400 text-sm">Fetching subscriptions and invoices from Stripe…</p>
                  </div>
                )}

                {rev && (
                  <>
                    {/* ── Top stats ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'MRR',             value: `$${rev.mrr.toLocaleString()}`,            sub: 'Monthly Recurring Revenue',        color: 'text-green-400' },
                        { label: 'ARR',             value: `$${rev.arr.toLocaleString()}`,            sub: 'Annual Run Rate',                  color: 'text-emerald-400' },
                        { label: 'Active Subs',     value: rev.activeCount,                            sub: `${rev.pastDueCount} past-due`,     color: 'text-cyan-400' },
                        { label: 'Monthly Churn',   value: `${rev.churnRate}%`,                        sub: `${rev.canceledThisMonth} cancelled this month`,  color: rev.churnRate > 5 ? 'text-red-400' : 'text-amber-400' },
                      ].map(card => (
                        <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                          <div className="text-xs text-gray-500 mb-1">{card.label}</div>
                          <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                          <div className="text-xs text-gray-600 mt-0.5">{card.sub}</div>
                        </div>
                      ))}
                    </div>

                    {/* ── This month snapshot ── */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'New this month',     value: rev.newThisMonth,      color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20'  },
                        { label: 'Cancelled this month', value: rev.canceledThisMonth, color: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/20'     },
                        { label: 'Net this month',      value: rev.newThisMonth - rev.canceledThisMonth, color: rev.newThisMonth >= rev.canceledThisMonth ? 'text-green-400' : 'text-red-400', bg: 'bg-gray-800 border-gray-700' },
                      ].map(card => (
                        <div key={card.label} className={`border rounded-xl p-4 text-center ${card.bg}`}>
                          <div className={`text-3xl font-bold mb-1 ${card.color}`}>{card.value > 0 ? `+${card.value}` : card.value}</div>
                          <div className="text-xs text-gray-500">{card.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* ── Revenue bar chart (6 months) ── */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-5">
                        <span className="font-semibold">Monthly Revenue — Last 6 Months</span>
                        <span className="text-xs text-gray-500">6-month total: <span className="text-green-400 font-medium">${rev.sixMonthTotalDollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                      </div>
                      <div className="flex items-end gap-3 h-36">
                        {rev.monthlyRevenue.map(m => {
                          const pct = maxBar > 0 ? (m.amountDollars / maxBar) * 100 : 0;
                          const isCurrentMonth = m.month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                          return (
                            <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                              <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">${m.amountDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                              <div className="w-full flex flex-col justify-end" style={{ height: '96px' }}>
                                <div
                                  className={`w-full rounded-t-lg transition-all ${isCurrentMonth ? 'bg-cyan-500' : 'bg-gray-700 group-hover:bg-gray-600'}`}
                                  style={{ height: `${Math.max(pct, 4)}%` }}
                                />
                              </div>
                              <span className={`text-[10px] font-medium ${isCurrentMonth ? 'text-cyan-400' : 'text-gray-500'}`}>{m.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Referral commissions ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <div className="text-xs text-gray-500 mb-1">Commissions Owed</div>
                        <div className="text-2xl font-bold text-amber-400">{fmtDollars(totalPendingComm)}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{commissions.filter(c => c.status === 'pending').length} pending payments to referrers</div>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <div className="text-xs text-gray-500 mb-1">Net MRR (after commissions)</div>
                        <div className="text-2xl font-bold text-green-400">${(rev.mrr - (totalPendingComm / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                        <div className="text-xs text-gray-600 mt-0.5">MRR minus pending referral payouts</div>
                      </div>
                    </div>

                    {/* ── Recent invoices ── */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                        <span className="font-semibold">Recent Paid Invoices</span>
                        <button
                          onClick={() => downloadCSV(
                            ['Invoice ID','Email','Amount','Date','Status'],
                            rev.recentInvoices.map(inv => [inv.id, demoMode ? demoMaskEmail(inv.email) : inv.email, `$${inv.amount.toFixed(2)}`, new Date(inv.date).toLocaleDateString(), inv.status])
                          , 'nxxt-invoices')}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 border border-gray-700"
                        >
                          <Download className="w-4 h-4" /> CSV
                        </button>
                      </div>
                      {rev.recentInvoices.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">No paid invoices in this period.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b border-gray-800 text-left">{['Invoice','Email','Amount','Date','Status'].map(h => <th key={h} className="py-3 px-4 text-gray-500 text-xs font-medium">{h}</th>)}</tr></thead>
                            <tbody>
                              {rev.recentInvoices.map(inv => (
                                <tr key={inv.id} className="border-b border-gray-800/50 hover:bg-white/5">
                                  <td className="py-3 px-4 font-mono text-xs text-gray-500">{inv.id.slice(0, 14)}…</td>
                                  <td className="py-3 px-4">{demoMode ? demoMaskEmail(inv.email) : inv.email}</td>
                                  <td className="py-3 px-4 text-green-400 font-medium">${inv.amount.toFixed(2)}</td>
                                  <td className="py-3 px-4 text-gray-500 text-xs">{new Date(inv.date).toLocaleDateString()}</td>
                                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">Paid ✓</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Notifications ({unreadNotifs} unread)</span>
                {unreadNotifs > 0 && <button onClick={handleMarkAllRead} className="text-xs text-cyan-400 underline">Mark all read</button>}
              </div>
              {notifications.length === 0 ? <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">No notifications yet.</div>
                : notifications.map(notif => (
                  <div key={notif.id} className={`bg-gray-900 border rounded-xl p-4 flex items-start gap-3 ${notif.read ? 'border-gray-800' : 'border-cyan-500/30 bg-cyan-500/5'}`}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-cyan-500/20">{notif.notification_type === 'quiz_completion' ? '🏅' : notif.notification_type === 'elite_upgrade' ? '⚡' : <Bell className="w-4 h-4 text-cyan-400" />}</div>
                    <div className="flex-1"><p className="text-sm text-gray-200">{notif.message}</p><p className="text-xs text-gray-600 mt-1">{new Date(notif.created_at).toLocaleString()}</p></div>
                    {!notif.read && <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0 mt-1.5" />}
                  </div>
                ))}
            </div>
          )}

          {/* ── SUPPORT ── */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[{ label: 'Open', count: tickets.filter(t => t.status === 'open').length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' }, { label: 'In Progress', count: tickets.filter(t => t.status === 'in_progress').length, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' }, { label: 'Resolved', count: tickets.filter(t => t.status === 'resolved').length, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' }].map(item => (
                  <div key={item.label} className={`border rounded-xl p-4 text-center ${item.bg}`}><div className={`text-3xl font-bold ${item.color}`}>{item.count}</div><div className="text-xs text-gray-400 mt-1">{item.label}</div></div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <select value={ticketFilter} onChange={e => setTicketFilter(e.target.value)} className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"><option value="all">All</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option></select>
                <button onClick={() => downloadCSV(['ID','Date','Email','Category','Subject','Message','Status'], filteredTickets.map(t => [t.id.slice(0,8), new Date(t.created_at).toLocaleString(), showEmail(t.email), t.category, t.subject, t.message, t.status]), 'nxxt-support')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 border border-gray-700 sm:ml-auto"><Download className="w-4 h-4" /> CSV</button>
              </div>
              {filteredTickets.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">No tickets found{ticketFilter !== 'all' ? ` with status "${ticketFilter}"` : ''}.</div>
              ) : (
                <div className="space-y-2">
                  {filteredTickets.map(ticket => {
                    const isExpanded = expandedTicket === ticket.id;
                    return (
                      <div key={ticket.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                        <div className="p-4 flex items-center gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">{getTicketStatusBadge(ticket.status)}<span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-400">{ticket.category}</span><span className="text-xs text-gray-500">{new Date(ticket.created_at).toLocaleString()}</span></div>
                            <p className="text-sm font-semibold text-white truncate">{ticket.subject}</p>
                            <p className="text-xs text-gray-500">{showEmail(ticket.email)}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                            {(['open','in_progress','resolved'] as const).map(s => (
                              <button key={s} onClick={() => handleUpdateTicketStatus(ticket.id, s)} disabled={updatingTicket === ticket.id || ticket.status === s}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${ticket.status === s ? s === 'open' ? 'bg-red-500/30 text-red-300 border border-red-500/40' : s === 'in_progress' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/40' : 'bg-green-500/30 text-green-300 border border-green-500/40' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'}`}>
                                {updatingTicket === ticket.id ? '…' : s === 'open' ? 'Open' : s === 'in_progress' ? 'In Progress' : 'Resolved'}
                              </button>
                            ))}
                            <button onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)} className="p-1.5 text-gray-500 hover:text-gray-300">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-800">
                            <p className="text-xs text-gray-500 mt-3 mb-1">Full Message:</p>
                            <p className="text-sm text-gray-200 whitespace-pre-wrap bg-[#0A0B0D] border border-gray-800 rounded-lg p-3">{ticket.message}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SYSTEM ── */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="font-bold mb-4">System Information</h2>
                <div className="space-y-3 text-sm">
                  {[['Total Users', stats?.totalUsers || 0], ['Elite Users', stats?.eliteUsers || 0], ['Total Signals', signals.length], ['Active Signals', signals.filter(s => s.status === 'ACTIVE').length], ['Promo Codes', promoCodes.length], ['Total Referrals', referrals.length], ['Converted Referrals', referrals.filter(r => r.status === 'converted').length], ['Pending Commissions', fmtDollars(totalPendingComm)], ['Support Tickets', tickets.length], ['Open Tickets', tickets.filter(t => t.status === 'open').length], ['System Status', '✅ Operational']].map(([label, value]) => (
                    <div key={String(label)} className="flex justify-between py-2 border-b border-gray-800"><span className="text-gray-400">{label}</span><span className="font-mono text-white">{value}</span></div>
                  ))}
                </div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div><p className="text-yellow-400 font-semibold mb-1">Admin Access Active</p><p className="text-gray-400">Full system access. All actions are permanent. Use responsibly.</p></div>
              </div>
            </div>
          )}

          </>
        )}
      </div>

      {/* ── PROMO CODE MODAL ── */}
      {showPromoModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingPromo ? 'Edit Promo Code' : 'Create Promo Code'}</h3>
              <button onClick={() => setShowPromoModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Code <span className="text-red-400">*</span></label>
                <input type="text" value={promoForm.code} onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g,'') }))} placeholder="e.g. SUMMER30" className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <input type="text" value={promoForm.description ?? ''} onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Summer launch discount" className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Discount % <span className="text-red-400">*</span></label>
                <input type="number" min={1} max={100} value={promoForm.discount_percent} onChange={e => setPromoForm(f => ({ ...f, discount_percent: parseInt(e.target.value) || 0 }))} className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500" />
                {promoForm.discount_percent > 0 && promoForm.discount_percent <= 100 && <p className="text-xs text-gray-500 mt-1">First month: <span className="text-green-400">${(97 * (1 - promoForm.discount_percent / 100)).toFixed(2)}</span> instead of $97</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stripe Coupon ID <span className="text-gray-600">(required for checkout)</span></label>
                <input type="text" value={promoForm.stripe_coupon_id ?? ''} onChange={e => setPromoForm(f => ({ ...f, stripe_coupon_id: e.target.value.trim() }))} placeholder="from Stripe Dashboard → Coupons" className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-500" />
                <p className="text-xs text-gray-600 mt-1">Get ID from <a href="https://dashboard.stripe.com/coupons" target="_blank" rel="noreferrer" className="text-cyan-500 underline">Stripe Dashboard → Coupons</a></p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Uses <span className="text-gray-600">(blank = unlimited)</span></label>
                  <input type="number" min={1} value={promoForm.max_uses ?? ''} onChange={e => setPromoForm(f => ({ ...f, max_uses: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Unlimited" className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Expiry Date <span className="text-gray-600">(blank = never)</span></label>
                  <input type="date" value={promoForm.expires_at ?? ''} onChange={e => setPromoForm(f => ({ ...f, expires_at: e.target.value || null }))} className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500" />
                </div>
              </div>
              <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-800 rounded-lg">
                <div><div className="text-sm font-medium">Active</div><div className="text-xs text-gray-500">Code usable at checkout</div></div>
                <input type="checkbox" checked={promoForm.active} onChange={e => setPromoForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-cyan-500" />
              </label>
              {promoFormError && <p className="text-xs text-red-400">{promoFormError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={handleSavePromo} disabled={promoSaving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg font-semibold text-sm">
                  {promoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{editingPromo ? 'Save Changes' : 'Create Code'}
                </button>
                <button onClick={() => setShowPromoModal(false)} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT USER MODAL ── */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Edit User #{editingUser.user_number}</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-xs text-gray-500 mb-1">Email</label><input value={editingUser.email} disabled className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Subscription Tier</label><select value={editForm.subscription_tier} onChange={e => setEditForm({ ...editForm, subscription_tier: e.target.value })} className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"><option value="free">Free Trader</option><option value="elite">Elite Trader</option></select></div>
              <div className="space-y-3 pt-2">
                {[{ key: 'is_admin', label: 'Is Admin', desc: 'Full admin panel access' }, { key: 'bypass_stripe', label: 'Bypass Stripe', desc: 'Manual Elite without payment' }].map(item => (
                  <label key={item.key} className="flex items-center justify-between cursor-pointer p-3 bg-gray-800 rounded-lg">
                    <div><div className="text-sm font-medium">{item.label}</div><div className="text-xs text-gray-500">{item.desc}</div></div>
                    <input type="checkbox" checked={(editForm as any)[item.key]} onChange={e => setEditForm({ ...editForm, [item.key]: e.target.checked })} className="w-4 h-4 accent-cyan-500" />
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSaveUser} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold text-sm"><Check className="w-4 h-4" /> Save Changes</button>
                <button onClick={() => setEditingUser(null)} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
