// src/pages/ReferralPage.tsx
// NXXT Futures — Referral Dashboard (Phase 5)
// Features: custom slug, payout methods (2 max), TOS/age gate,
//           commission due dates, forfeiture countdown, legal notices

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, PayoutMethod } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Share2, Copy, CheckCircle, Users, DollarSign, Clock, Loader2,
  Gift, TrendingUp, Crown, Edit2, Save, X, AlertTriangle,
  Shield, Plus, Trash2, Star, RefreshCw, ExternalLink
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────
interface Referral {
  id: string; created_at: string; referred_email: string;
  status: 'pending' | 'converted' | 'cancelled'; converted_at: string | null;
}
interface Commission {
  id: string; created_at: string; amount_cents: number;
  billing_month: string; status: 'pending' | 'paid' | 'cancelled' | 'forfeited';
  paid_at: string | null; due_date: string | null; forfeiture_date: string | null;
}

const PAYOUT_TYPES = [
  { value: 'PayPal',             placeholder: 'Your PayPal email address' },
  { value: 'Wise',               placeholder: 'Your Wise email or account number' },
  { value: 'USDT (TRC20)',       placeholder: 'TRC20 wallet address (starts with T...)' },
  { value: 'USDT (ERC20)',       placeholder: 'ERC20 wallet address (starts with 0x...)' },
  { value: 'Bitcoin (BTC)',      placeholder: 'Bitcoin wallet address' },
  { value: 'Bank Wire (SWIFT)',  placeholder: 'Bank name, IBAN/Account No., SWIFT/BIC code' },
];

const TOS_VERSION = '2026-03';
const SLUG_REGEX  = /^(?!.*--)[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;

// ── Helpers ───────────────────────────────────────────────────
const fmtDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const daysUntil = (d: string) =>
  Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));
const daysAgo = (d: string) =>
  Math.max(0, Math.ceil((Date.now() - new Date(d).getTime()) / 86400000));

// ── Main component ────────────────────────────────────────────
export function ReferralPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // ── Data state ──────────────────────────────────────────────
  const [referrals,   setReferrals]   = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [copied,      setCopied]      = useState(false);

  // ── Slug editor state ───────────────────────────────────────
  const [editingSlug,   setEditingSlug]   = useState(false);
  const [slugInput,     setSlugInput]     = useState('');
  const [slugError,     setSlugError]     = useState('');
  const [slugSaving,    setSlugSaving]    = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking,  setSlugChecking]  = useState(false);

  // ── Payout methods state ────────────────────────────────────
  const [payoutMethods,  setPayoutMethods]  = useState<PayoutMethod[]>([]);
  const [editingPayout,  setEditingPayout]  = useState(false);
  const [payoutSaving,   setPayoutSaving]   = useState(false);
  const [payoutError,    setPayoutError]    = useState('');
  const [payoutSuccess,  setPayoutSuccess]  = useState('');

  // ── TOS / age gate ──────────────────────────────────────────
  const [tosChecked,      setTosChecked]      = useState(false);
  const [ageChecked,      setAgeChecked]      = useState(false);
  const [tosAccepting,    setTosAccepting]    = useState(false);
  const [tosError,        setTosError]        = useState('');

  // ── Derived ─────────────────────────────────────────────────
  const tosAccepted  = !!profile?.tos_accepted_at;
  const activeLink   = profile?.referral_slug || profile?.referral_code;
  const referralLink = activeLink
    ? `https://www.nxxtfutures.com/signup?ref=${profile?.referral_slug ?? profile?.referral_code}`
    : null;

  // ── Load data ────────────────────────────────────────────────
  useEffect(() => {
    if (profile) {
      setPayoutMethods(profile.payout_methods || []);
      loadData();
    }
  }, [profile?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: refs }, { data: comms }] = await Promise.all([
        supabase.from('referrals')
          .select('id, created_at, referred_email, status, converted_at')
          .order('created_at', { ascending: false }),
        supabase.from('referral_commissions')
          .select('id, created_at, amount_cents, billing_month, status, paid_at, due_date, forfeiture_date')
          .order('created_at', { ascending: false }),
      ]);
      setReferrals(refs || []);
      setCommissions(comms || []);
    } catch (err) {
      console.error('Failed to load referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Copy link ─────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!referralLink) return;
    try { await navigator.clipboard.writeText(referralLink); }
    catch {
      const el = document.createElement('textarea');
      el.value = referralLink;
      document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ── Slug: check availability with debounce ────────────────────
  useEffect(() => {
    if (!slugInput || !SLUG_REGEX.test(slugInput)) {
      setSlugAvailable(null); return;
    }
    if (slugInput === profile?.referral_slug) {
      setSlugAvailable(true); return;
    }
    setSlugChecking(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles').select('id').eq('referral_slug', slugInput).single();
      setSlugAvailable(!data);
      setSlugChecking(false);
    }, 500);
    return () => clearTimeout(t);
  }, [slugInput]);

  // ── Slug: validate input ──────────────────────────────────────
  const validateSlug = (v: string) => {
    if (!v) return 'Slug is required.';
    if (v.length < 3) return 'Minimum 3 characters.';
    if (v.length > 20) return 'Maximum 20 characters.';
    if (!SLUG_REGEX.test(v)) return 'Only lowercase letters, numbers, and hyphens. No leading/trailing hyphens or double hyphens.';
    return '';
  };

  // ── Slug: save ────────────────────────────────────────────────
  const handleSaveSlug = async () => {
    const err = validateSlug(slugInput);
    if (err) { setSlugError(err); return; }
    if (slugAvailable === false) { setSlugError('This slug is already taken.'); return; }
    setSlugSaving(true); setSlugError('');
    const { error } = await supabase
      .from('profiles').update({ referral_slug: slugInput }).eq('id', profile!.id);
    if (error) {
      setSlugError(error.message.includes('unique') ? 'This slug is already taken.' : error.message);
    } else {
      await refreshProfile();
      setEditingSlug(false);
    }
    setSlugSaving(false);
  };

  // ── TOS: accept ───────────────────────────────────────────────
  const handleAcceptTos = async () => {
    setTosError('');
    if (!tosChecked) { setTosError('Please agree to the Terms of Service.'); return; }
    if (!ageChecked) { setTosError('Please confirm you meet the age requirement.'); return; }
    setTosAccepting(true);
    const { error } = await supabase.from('profiles').update({
      tos_accepted_at: new Date().toISOString(),
      tos_version:     TOS_VERSION,
      age_verified:    true,
    }).eq('id', profile!.id);
    if (error) { setTosError('Failed to save. Please try again.'); }
    else       { await refreshProfile(); }
    setTosAccepting(false);
  };

  // ── Payout: add method ────────────────────────────────────────
  const addPayoutMethod = () => {
    if (payoutMethods.length >= 2) return;
    setPayoutMethods(prev => [...prev, {
      id: String(Date.now()),
      type: 'PayPal',
      details: '',
      primary: prev.length === 0,
    }]);
  };

  const removePayoutMethod = (id: string) => {
    setPayoutMethods(prev => {
      const next = prev.filter(m => m.id !== id);
      // If removed the primary, make first remaining primary
      if (next.length > 0 && !next.some(m => m.primary)) next[0].primary = true;
      return next;
    });
  };

  const updatePayoutMethod = (id: string, field: keyof PayoutMethod, value: string | boolean) => {
    setPayoutMethods(prev => prev.map(m => {
      if (m.id !== id) return m;
      const updated = { ...m, [field]: value };
      return updated;
    }));
  };

  const setPrimary = (id: string) => {
    setPayoutMethods(prev => prev.map(m => ({ ...m, primary: m.id === id })));
  };

  // ── Payout: save ──────────────────────────────────────────────
  const handleSavePayout = async () => {
    setPayoutError(''); setPayoutSuccess('');
    for (const m of payoutMethods) {
      if (!m.details.trim()) { setPayoutError(`Please enter details for your ${m.type} method.`); return; }
    }
    const hasPrimary = payoutMethods.length === 0 || payoutMethods.some(m => m.primary);
    if (!hasPrimary && payoutMethods.length > 0) { setPayoutError('Please mark one method as primary.'); return; }

    setPayoutSaving(true);
    const { error } = await supabase.from('profiles')
      .update({ payout_methods: payoutMethods }).eq('id', profile!.id);
    if (error) { setPayoutError('Failed to save. Please try again.'); }
    else {
      await refreshProfile();
      setEditingPayout(false);
      setPayoutSuccess('Payout methods saved successfully.');
      setTimeout(() => setPayoutSuccess(''), 3000);
    }
    setPayoutSaving(false);
  };

  // ── Derived stats ─────────────────────────────────────────────
  const totalReferrals = referrals.length;
  const converted      = referrals.filter(r => r.status === 'converted').length;
  const pending        = referrals.filter(r => r.status === 'pending').length;
  const totalEarned    = commissions.reduce((s, c) => s + (c.status !== 'cancelled' && c.status !== 'forfeited' ? c.amount_cents : 0), 0);
  const paidOut        = commissions.reduce((s, c) => s + (c.status === 'paid' ? c.amount_cents : 0), 0);
  const pendingPayout  = totalEarned - paidOut;
  const overdueComms   = commissions.filter(c => c.status === 'pending' && c.due_date && new Date(c.due_date) < new Date());

  const slugPlaceholderType = PAYOUT_TYPES.find(t => t.value === payoutMethods[0]?.type)?.placeholder ?? '';

  // ── JSX ───────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

      {/* Header */}
      <div className="text-center mb-2">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-3">
          <Share2 className="w-7 h-7 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Refer & Earn</h1>
        <p className="text-sm text-gray-400 mt-1">
          Earn <span className="text-amber-400 font-semibold">$25/month</span> for every Elite trader you bring in.
          Lifetime — no cap.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Earned',     value: fmtDollars(totalEarned),   icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10'  },
          { label: 'Pending Payout',   value: fmtDollars(pendingPayout), icon: Clock,      color: 'text-amber-400', bg: 'bg-amber-500/10'  },
          { label: 'Active Referrals', value: String(converted),          icon: Users,      color: 'text-cyan-400',  bg: 'bg-cyan-500/10'   },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-[#111318] border border-[#1E2128] rounded-2xl p-4 text-center">
              <div className={`inline-flex p-2 rounded-xl ${card.bg} mb-2`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Overdue commission warning ── */}
      {overdueComms.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400">{overdueComms.length} commission{overdueComms.length > 1 ? 's' : ''} overdue for payout</p>
            <p className="text-xs text-gray-400 mt-0.5">
              These are past their 30-day payout window. Contact <a href="mailto:iconmigs@gmail.com" className="text-red-400 underline">iconmigs@gmail.com</a> if you have questions. Commissions forfeit 120 days after creation — no exceptions.
            </p>
          </div>
        </div>
      )}

      {/* ── Referral Link card ── */}
      <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-white text-sm">Your Referral Link</span>
          </div>
          {!editingSlug && (
            <button
              onClick={() => { setEditingSlug(true); setSlugInput(profile?.referral_slug ?? ''); setSlugError(''); setSlugAvailable(null); }}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              {profile?.referral_slug ? 'Edit slug' : 'Customize slug'}
            </button>
          )}
        </div>

        {/* Live link display */}
        {referralLink && !editingSlug && (
          <>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 bg-[#0A0B0D] border border-[#2A2D36] rounded-xl px-4 py-2.5 text-xs text-gray-300 font-mono truncate">
                {referralLink}
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
                  copied
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                }`}
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-amber-500/5 border border-amber-500/15 rounded-xl">
              <span className="text-amber-400 text-xs font-mono font-bold">{profile?.referral_slug ?? profile?.referral_code}</span>
              {profile?.referral_slug
                ? <span className="text-gray-600 text-xs">— custom slug</span>
                : <span className="text-gray-600 text-xs">— auto-generated code · customize above</span>}
            </div>
          </>
        )}

        {/* Slug editor */}
        {editingSlug && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Custom slug (3–20 chars, lowercase, numbers, hyphens only)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs font-mono select-none">
                  /signup?ref=
                </span>
                <input
                  type="text"
                  value={slugInput}
                  onChange={e => {
                    setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    setSlugError('');
                    setSlugAvailable(null);
                  }}
                  maxLength={20}
                  placeholder="yourname"
                  className="w-full bg-[#0A0B0D] border border-[#2A2D36] rounded-xl pl-[6.5rem] pr-4 py-2.5 text-sm text-white placeholder-gray-700 font-mono focus:outline-none focus:border-amber-500/50 transition-all"
                />
                {slugChecking && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-500" />
                )}
                {!slugChecking && slugAvailable === true && SLUG_REGEX.test(slugInput) && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                )}
                {!slugChecking && slugAvailable === false && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                )}
              </div>
              {slugInput && !SLUG_REGEX.test(slugInput) && !slugError && (
                <p className="text-xs text-gray-600 mt-1">Lowercase letters, numbers, hyphens only. Cannot start/end with hyphen.</p>
              )}
              {slugAvailable === false && <p className="text-xs text-red-400 mt-1">This slug is already taken. Try another.</p>}
              {slugAvailable === true && SLUG_REGEX.test(slugInput) && <p className="text-xs text-green-400 mt-1">✓ Available!</p>}
              {slugError && <p className="text-xs text-red-400 mt-1">{slugError}</p>}
            </div>

            {slugInput && SLUG_REGEX.test(slugInput) && (
              <div className="p-2.5 bg-[#0A0B0D] border border-[#2A2D36] rounded-xl text-xs text-gray-400 font-mono">
                nxxtfutures.com/signup?ref=<span className="text-amber-400">{slugInput}</span>
              </div>
            )}

            <div className="text-xs text-amber-400/70 leading-relaxed">
              ⚠ Your old auto-generated link still works after you set a custom slug. Both links point to you.
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveSlug}
                disabled={slugSaving || slugAvailable === false || !SLUG_REGEX.test(slugInput)}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 disabled:opacity-40 text-amber-400 rounded-xl text-xs font-semibold transition-all"
              >
                {slugSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {slugSaving ? 'Saving…' : 'Save Slug'}
              </button>
              <button
                onClick={() => { setEditingSlug(false); setSlugError(''); }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs text-gray-400 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── TOS Gate (if not accepted yet) ── */}
      {!tosAccepted && (
        <div className="bg-[#111318] border border-amber-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-white text-sm">Activate Payouts — Required</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            Before you can receive commission payments, you must agree to our Referral Program Terms and confirm your age.
            You can still share your link and earn commissions now — your balance will be held until you complete this setup.
          </p>
          <div className="space-y-3 mb-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => setTosChecked(v => !v)}
                className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  tosChecked ? 'bg-amber-500 border-amber-500' : 'border-gray-600 group-hover:border-amber-500/50'
                }`}
              >
                {tosChecked && <CheckCircle className="w-3 h-3 text-black" />}
              </div>
              <span className="text-xs text-gray-300 leading-relaxed">
                I have read and agree to the{' '}
                <button
                  onClick={() => window.open('/terms', '_blank')}
                  className="text-amber-400 underline inline-flex items-center gap-0.5"
                >
                  Terms of Service <ExternalLink className="w-3 h-3" />
                </button>
                , including the payout schedule, forfeiture policy, and no-refund policy.
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => setAgeChecked(v => !v)}
                className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  ageChecked ? 'bg-amber-500 border-amber-500' : 'border-gray-600 group-hover:border-amber-500/50'
                }`}
              >
                {ageChecked && <CheckCircle className="w-3 h-3 text-black" />}
              </div>
              <span className="text-xs text-gray-300 leading-relaxed">
                I confirm I am <strong>18 years of age or older</strong>, or meet the legal age requirement in my country to receive payments and enter binding agreements.
              </span>
            </label>
          </div>
          {tosError && (
            <p className="text-xs text-red-400 mb-3">{tosError}</p>
          )}
          <button
            onClick={handleAcceptTos}
            disabled={tosAccepting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 disabled:opacity-50 text-amber-400 font-semibold text-sm rounded-xl transition-all"
          >
            {tosAccepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {tosAccepting ? 'Activating…' : 'Activate Payouts'}
          </button>
        </div>
      )}

      {/* ── Payout Methods (only after TOS accepted) ── */}
      {tosAccepted && (
        <div className="bg-[#111318] border border-[#1E2128] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1E2128] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="font-semibold text-white text-sm">Payout Methods</span>
              <span className="text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">up to 2</span>
            </div>
            {!editingPayout && (
              <button
                onClick={() => { setEditingPayout(true); setPayoutError(''); setPayoutSuccess(''); }}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
          </div>

          <div className="p-5">
            {/* View mode */}
            {!editingPayout && (
              <>
                {payoutMethods.length === 0 ? (
                  <div className="text-center py-4">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                    <p className="text-sm text-gray-500">No payout methods set.</p>
                    <button
                      onClick={() => { setEditingPayout(true); addPayoutMethod(); }}
                      className="mt-3 text-xs text-amber-400 underline"
                    >
                      Add your first payout method
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payoutMethods.map(m => (
                      <div key={m.id} className="flex items-start gap-3 p-3 bg-[#0A0B0D] border border-[#2A2D36] rounded-xl">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-white">{m.type}</span>
                            {m.primary && (
                              <span className="flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                                <Star className="w-2.5 h-2.5" /> Primary
                              </span>
                            )}
                            {!m.primary && (
                              <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded-full">Secondary</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-mono truncate">{m.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {payoutSuccess && (
                  <p className="text-xs text-green-400 mt-3 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> {payoutSuccess}
                  </p>
                )}
              </>
            )}

            {/* Edit mode */}
            {editingPayout && (
              <div className="space-y-4">
                {payoutMethods.map((m, idx) => {
                  const typeInfo = PAYOUT_TYPES.find(t => t.value === m.type);
                  const isBankWire = m.type === 'Bank Wire (SWIFT)';
                  return (
                    <div key={m.id} className="border border-[#2A2D36] rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-300">
                          Method {idx + 1}
                          {m.primary && <span className="ml-2 text-amber-400">(Primary)</span>}
                        </span>
                        <button onClick={() => removePayoutMethod(m.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Type selector */}
                      <div>
                        <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Payment Method</label>
                        <select
                          value={m.type}
                          onChange={e => updatePayoutMethod(m.id, 'type', e.target.value)}
                          className="w-full bg-[#0A0B0D] border border-[#2A2D36] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all"
                        >
                          {PAYOUT_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.value}</option>
                          ))}
                        </select>
                      </div>

                      {/* Details */}
                      <div>
                        <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Details</label>
                        {isBankWire ? (
                          <textarea
                            value={m.details}
                            onChange={e => updatePayoutMethod(m.id, 'details', e.target.value)}
                            placeholder={typeInfo?.placeholder}
                            rows={3}
                            className="w-full bg-[#0A0B0D] border border-[#2A2D36] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-amber-500/50 transition-all resize-none"
                          />
                        ) : (
                          <input
                            type="text"
                            value={m.details}
                            onChange={e => updatePayoutMethod(m.id, 'details', e.target.value)}
                            placeholder={typeInfo?.placeholder}
                            className="w-full bg-[#0A0B0D] border border-[#2A2D36] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-amber-500/50 transition-all"
                          />
                        )}
                      </div>

                      {/* Primary toggle */}
                      {payoutMethods.length > 1 && (
                        <button
                          onClick={() => setPrimary(m.id)}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
                            m.primary
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-gray-800 text-gray-500 hover:text-gray-300 border border-gray-700'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5" />
                          {m.primary ? 'Primary method' : 'Set as primary'}
                        </button>
                      )}
                    </div>
                  );
                })}

                {payoutMethods.length < 2 && (
                  <button
                    onClick={addPayoutMethod}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#2A2D36] hover:border-amber-500/30 rounded-xl text-xs text-gray-500 hover:text-amber-400 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add a second method (optional)
                  </button>
                )}

                {payoutError && <p className="text-xs text-red-400">{payoutError}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={handleSavePayout}
                    disabled={payoutSaving}
                    className="flex items-center gap-1.5 px-5 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 disabled:opacity-40 text-green-400 rounded-xl text-xs font-semibold transition-all"
                  >
                    {payoutSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {payoutSaving ? 'Saving…' : 'Save Methods'}
                  </button>
                  <button
                    onClick={() => { setEditingPayout(false); setPayoutMethods(profile?.payout_methods || []); setPayoutError(''); }}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs text-gray-400 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Payout legal notices */}
            <div className="mt-4 space-y-2">
              <div className="p-3 bg-[#0A0B0D] border border-[#1E2128] rounded-xl text-xs text-gray-600 leading-relaxed space-y-1.5">
                <p>💸 <strong className="text-gray-500">Payout schedule:</strong> 30 days after your referral's payment is received, minus applicable transfer fees.</p>
                <p>⏰ <strong className="text-gray-500">Forfeiture:</strong> Commissions are permanently forfeited 90 days after their payout date (120 days from creation). No exceptions.</p>
                <p>⚠️ <strong className="text-gray-500">Your responsibility:</strong> NXXT Futures is not responsible for lost payments or payments sent to incorrect/outdated details you provided. Keep your info current.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── How it works ── */}
      <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-white text-sm">How It Works</span>
        </div>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Share your link',    desc: 'Send your unique referral link to traders, Discord servers, Twitter/X, or your community.' },
            { step: '2', title: 'They sign up',        desc: 'When someone registers using your link, they\'re tracked as your referral.' },
            { step: '3', title: 'They go Elite',       desc: 'When they upgrade to Elite ($97/month), your commission clock starts.' },
            { step: '4', title: 'You earn $25/month',  desc: 'Every month they stay Elite, $25 is credited to your account. Lifetime — no cap.' },
            { step: '5', title: 'Paid in 30 days',     desc: 'Commissions are paid out 30 days after their billing, minus transfer fees. Unclaimed amounts forfeit after 120 days.' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-cyan-400 text-xs font-bold">{item.step}</span>
              </div>
              <div>
                <div className="text-sm font-medium text-white">{item.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => window.open('/terms', '_blank')}
          className="mt-4 flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> Full Terms of Service
        </button>
      </div>

      {/* ── Commission History ── */}
      <div className="bg-[#111318] border border-[#1E2128] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E2128] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-white text-sm">Commission History</span>
          </div>
          <span className="text-xs text-gray-500">{commissions.length} total</span>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>
        ) : commissions.length === 0 ? (
          <div className="py-10 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-700" />
            <p className="text-sm text-gray-500">No commissions yet.</p>
            <p className="text-xs text-gray-600 mt-1">Commissions appear here when your referrals convert to Elite.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1E2128]">
            {commissions.map(c => {
              const isOverdue  = c.status === 'pending' && c.due_date && new Date(c.due_date) < new Date();
              const daysLeft   = c.forfeiture_date ? daysUntil(c.forfeiture_date) : null;
              const forfeitSoon = c.status === 'pending' && daysLeft !== null && daysLeft <= 14;
              return (
                <div key={c.id} className={`px-5 py-3.5 ${forfeitSoon ? 'bg-red-500/5' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium">{c.billing_month}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {c.due_date && c.status === 'pending' && (
                          <span className={`text-[10px] ${isOverdue ? 'text-red-400' : 'text-gray-600'}`}>
                            {isOverdue
                              ? `⚠ Overdue by ${daysAgo(c.due_date)} days`
                              : `Due ${fmtDate(c.due_date)}`}
                          </span>
                        )}
                        {c.status === 'paid' && c.paid_at && (
                          <span className="text-[10px] text-gray-600">Paid {fmtDate(c.paid_at)}</span>
                        )}
                        {forfeitSoon && (
                          <span className="text-[10px] text-red-400 font-medium">
                            ⚠ Forfeits in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-green-400">{fmtDollars(c.amount_cents)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      c.status === 'paid'      ? 'bg-green-500/20 text-green-400'  :
                      c.status === 'forfeited' ? 'bg-gray-800 text-gray-600'       :
                      c.status === 'cancelled' ? 'bg-gray-800 text-gray-600'       :
                      isOverdue                ? 'bg-red-500/20 text-red-400'      :
                                                 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {c.status === 'paid'      ? 'Paid ✓'   :
                       c.status === 'forfeited' ? 'Forfeited' :
                       c.status === 'cancelled' ? 'Cancelled' :
                       isOverdue                ? 'Overdue'   : 'Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Referrals list ── */}
      <div className="bg-[#111318] border border-[#1E2128] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E2128] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-white text-sm">My Referrals ({totalReferrals})</span>
          </div>
          {pending > 0 && <span className="text-xs text-amber-400">{pending} pending</span>}
        </div>

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>
        ) : referrals.length === 0 ? (
          <div className="py-10 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-700" />
            <p className="text-sm text-gray-500">No referrals yet.</p>
            <p className="text-xs text-gray-600 mt-1">Share your link and your referrals will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1E2128]">
            {referrals.map(ref => (
              <div key={ref.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  ref.status === 'converted' ? 'bg-green-400' :
                  ref.status === 'cancelled' ? 'bg-red-400'   : 'bg-amber-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 truncate">{ref.referred_email}</div>
                  <div className="text-xs text-gray-600">{fmtDate(ref.created_at)}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  ref.status === 'converted' ? 'bg-green-500/20 text-green-400' :
                  ref.status === 'cancelled' ? 'bg-gray-500/20 text-gray-500'  : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {ref.status === 'converted' ? 'Elite ✓' : ref.status === 'cancelled' ? 'Cancelled' : 'Signed Up'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upgrade nudge — free users only */}
      {profile?.subscription_tier !== 'elite' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-center">
          <Crown className="w-7 h-7 text-amber-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-white mb-1">Upgrade to Elite to maximize your referral conversions</p>
          <p className="text-xs text-gray-400 mb-4">Elite Traders convert referrals at a higher rate because they speak from real experience.</p>
          <button
            onClick={() => navigate('/pricing')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-sm rounded-xl transition-all"
          >
            <Crown className="w-4 h-4" /> Upgrade to Elite
          </button>
        </div>
      )}

    </div>
  );
}
