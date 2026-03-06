// src/pages/ReferralPage.tsx
// NXXT Futures — User Referral Dashboard
// Phase 4: Full referral system — unique link, stats, commission history

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Share2, Copy, CheckCircle, Users, DollarSign,
  Clock, Loader2, ChevronRight, Gift, TrendingUp, Crown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Referral {
  id: string;
  created_at: string;
  referred_email: string;
  status: 'pending' | 'converted' | 'cancelled';
  converted_at: string | null;
}

interface Commission {
  id: string;
  created_at: string;
  amount_cents: number;
  billing_month: string;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
}

export function ReferralPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [referrals,    setReferrals]    = useState<Referral[]>([]);
  const [commissions,  setCommissions]  = useState<Commission[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [copied,       setCopied]       = useState(false);

  const referralCode = profile?.referral_code ?? null;
  const referralLink = referralCode
    ? `https://www.nxxtfutures.com/signup?ref=${referralCode}`
    : null;

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: refs }, { data: comms }] = await Promise.all([
        supabase
          .from('referrals')
          .select('id, created_at, referred_email, status, converted_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('referral_commissions')
          .select('id, created_at, amount_cents, billing_month, status, paid_at')
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

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea');
      el.value = referralLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Derived stats
  const totalReferrals  = referrals.length;
  const converted       = referrals.filter(r => r.status === 'converted').length;
  const pending         = referrals.filter(r => r.status === 'pending').length;
  const totalEarned     = commissions.reduce((sum, c) => sum + (c.status !== 'cancelled' ? c.amount_cents : 0), 0);
  const paidOut         = commissions.reduce((sum, c) => sum + (c.status === 'paid' ? c.amount_cents : 0), 0);
  const pendingPayout   = totalEarned - paidOut;

  const fmtDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

      {/* Header */}
      <div className="text-center mb-2">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-3">
          <Share2 className="w-7 h-7 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Refer & Earn</h1>
        <p className="text-sm text-gray-400 mt-1">Earn <span className="text-amber-400 font-semibold">$25/month</span> for every trader you bring to NXXT Futures. Lifetime, as long as they stay Elite.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Earned',    value: fmtDollars(totalEarned),   icon: DollarSign, color: 'text-green-400',  bg: 'bg-green-500/10'  },
          { label: 'Pending Payout',  value: fmtDollars(pendingPayout), icon: Clock,      color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
          { label: 'Active Referrals',value: String(converted),          icon: Users,      color: 'text-cyan-400',   bg: 'bg-cyan-500/10'   },
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

      {/* Referral link card */}
      <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-white text-sm">Your Referral Link</span>
        </div>

        {referralCode ? (
          <>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 bg-[#0A0B0D] border border-[#2A2D36] rounded-xl px-4 py-2.5 text-xs text-gray-300 font-mono truncate">
                {referralLink}
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  copied
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                }`}
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
              <span className="text-amber-400 text-xs font-mono font-bold tracking-wider">{referralCode}</span>
              <span className="text-gray-600 text-xs">— your unique referral code</span>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-500 py-2">Loading your referral code…</div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-white text-sm">How It Works</span>
        </div>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Share your link',    desc: 'Send your unique referral link to traders, Discord groups, Twitter, or your community.' },
            { step: '2', title: 'They sign up',       desc: 'When someone clicks your link and creates an account, they\'re tracked as your referral.' },
            { step: '3', title: 'They go Elite',      desc: 'When they upgrade to Elite Trader ($97/month), you start earning.' },
            { step: '4', title: 'You earn $25/month', desc: 'For every month they remain Elite, $25 is added to your account. Lifetime — no cap.' },
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
        <div className="mt-4 p-3 bg-[#0A0B0D] border border-[#2A2D36] rounded-xl text-xs text-gray-500 leading-relaxed">
          Commissions are paid manually each month. Once your balance accumulates, we'll reach out via your account email to arrange payout. No minimum threshold.
        </div>
      </div>

      {/* Referrals list */}
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
                  ref.status === 'cancelled' ? 'bg-red-400' : 'bg-amber-400'
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

      {/* Commission history */}
      <div className="bg-[#111318] border border-[#1E2128] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E2128] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-white text-sm">Commission History</span>
          </div>
          <span className="text-xs text-gray-500">{commissions.length} payments</span>
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
            {commissions.map(c => (
              <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium">{c.billing_month}</div>
                  <div className="text-xs text-gray-600">{fmtDate(c.created_at)}</div>
                </div>
                <span className="text-sm font-bold text-green-400">{fmtDollars(c.amount_cents)}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  c.status === 'paid'      ? 'bg-green-500/20 text-green-400' :
                  c.status === 'cancelled' ? 'bg-gray-500/20 text-gray-500'  : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {c.status === 'paid' ? 'Paid' : c.status === 'cancelled' ? 'Cancelled' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upgrade nudge for free users */}
      {profile?.subscription_tier !== 'elite' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-center">
          <Crown className="w-7 h-7 text-amber-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-white mb-1">Upgrade to Elite to maximize your referrals</p>
          <p className="text-xs text-gray-400 mb-4">Elite Traders have higher referral conversion rates because they can speak from experience.</p>
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
