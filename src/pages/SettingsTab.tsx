// src/pages/SettingsTab.tsx
// NXXT Futures — User Settings

import { useState } from 'react';
import {
  User, Lock, Mail, Crown, Trash2, LogOut, CheckCircle,
  AlertTriangle, ChevronRight, Shield, Eye, EyeOff, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function SettingsTab() {
  const { profile, user, signOut, updatePassword, updateEmail, deleteAccount } = useAuth();
  const navigate = useNavigate();

  // ── Change Password ───────────────────────────────────────
  const [pwSection,   setPwSection]   = useState(false);
  const [curPw,       setCurPw]       = useState('');
  const [newPw,       setNewPw]       = useState('');
  const [confPw,      setConfPw]      = useState('');
  const [showCurPw,   setShowCurPw]   = useState(false);
  const [showNewPw,   setShowNewPw]   = useState(false);
  const [pwLoading,   setPwLoading]   = useState(false);
  const [pwMsg,       setPwMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  // ── Change Email ──────────────────────────────────────────
  const [emSection,   setEmSection]   = useState(false);
  const [newEmail,    setNewEmail]    = useState('');
  const [emLoading,   setEmLoading]   = useState(false);
  const [emMsg,       setEmMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  // ── Delete Account ────────────────────────────────────────
  const [delSection,  setDelSection]  = useState(false);
  const [delConfirm,  setDelConfirm]  = useState('');
  const [delLoading,  setDelLoading]  = useState(false);
  const [delMsg,      setDelMsg]      = useState<{ ok: boolean; text: string } | null>(null);

  const isElite = profile?.subscription_tier === 'elite';
  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  // ── Handlers ──────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwMsg(null);
    if (newPw.length < 8) { setPwMsg({ ok: false, text: 'Password must be at least 8 characters.' }); return; }
    if (newPw !== confPw) { setPwMsg({ ok: false, text: 'Passwords do not match.' }); return; }
    setPwLoading(true);
    const { error } = await updatePassword(newPw);
    setPwLoading(false);
    if (error) { setPwMsg({ ok: false, text: error.message || 'Failed to update password.' }); return; }
    setPwMsg({ ok: true, text: 'Password updated successfully.' });
    setCurPw(''); setNewPw(''); setConfPw('');
  };

  const handleChangeEmail = async () => {
    setEmMsg(null);
    if (!newEmail.includes('@')) { setEmMsg({ ok: false, text: 'Enter a valid email address.' }); return; }
    setEmLoading(true);
    const { error } = await updateEmail(newEmail);
    setEmLoading(false);
    if (error) { setEmMsg({ ok: false, text: error.message || 'Failed to update email.' }); return; }
    setEmMsg({ ok: true, text: 'Confirmation sent to your new email. Click the link to confirm the change.' });
    setNewEmail('');
  };

  const handleDeleteAccount = async () => {
    setDelMsg(null);
    if (delConfirm !== 'DELETE') { setDelMsg({ ok: false, text: 'Type DELETE (all caps) to confirm.' }); return; }
    setDelLoading(true);
    const { error } = await deleteAccount();
    setDelLoading(false);
    if (error) { setDelMsg({ ok: false, text: error.message || 'Failed to delete account. Contact support.' }); return; }
    await signOut();
    navigate('/');
  };

  // ── Reusable message box ──────────────────────────────────
  const Msg = ({ msg }: { msg: { ok: boolean; text: string } }) => (
    <div className={`flex items-start gap-2 p-3 rounded-xl text-sm mt-3 ${
      msg.ok
        ? 'bg-green-500/10 border border-green-500/20 text-green-400'
        : 'bg-red-500/10 border border-red-500/20 text-red-400'
    }`}>
      {msg.ok
        ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
      {msg.text}
    </div>
  );

  // ── Section card ──────────────────────────────────────────
  const Section = ({
    icon, title, subtitle, open, onToggle, danger = false, children
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    open: boolean;
    onToggle: () => void;
    danger?: boolean;
    children: React.ReactNode;
  }) => (
    <div className={`bg-[#111318] border rounded-2xl overflow-hidden transition-all ${
      danger ? 'border-red-500/20' : 'border-[#1E2128]'
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-all text-left"
      >
        <div className={`p-2 rounded-xl flex-shrink-0 ${danger ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
          <span className={danger ? 'text-red-400' : 'text-amber-400'}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-display font-semibold text-sm ${danger ? 'text-red-400' : 'text-white'}`}>{title}</div>
          <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-[#1E2128] pt-4">
          {children}
        </div>
      )}
    </div>
  );

  const inputClass = "w-full bg-[#0A0B0D] border border-[#1E2128] rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all";
  const btnPrimary = "flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-black font-display font-bold text-sm rounded-xl transition-all";
  const btnDanger  = "flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-display font-semibold text-sm rounded-xl transition-all";

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-4">

      {/* ── Account Info Card ─────────────────────────────── */}
      <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-white text-base truncate">{user?.email}</div>
            <div className="text-xs text-gray-500 mt-0.5">Member since {joinDate}</div>
          </div>
          <div className="ml-auto flex-shrink-0">
            {isElite ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-xs font-bold text-yellow-400">
                <Crown className="w-3 h-3" /> Elite
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-400">
                Free
              </span>
            )}
          </div>
        </div>

        {/* Subscription info */}
        <div className="bg-[#0A0B0D] border border-[#1E2128] rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Plan</span>
            <span className="text-white font-medium">{isElite ? 'Elite Trader — $97/mo' : 'Free Trader'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Signals</span>
            <span className="text-white font-medium">{isElite ? 'All signals unlocked' : '1 daily pick'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Education</span>
            <span className="text-white font-medium">{profile?.education_completion_pct ?? 0}% complete</span>
          </div>
        </div>

        {/* Upgrade CTA for free users */}
        {!isElite && (
          <button
            onClick={() => navigate('/pricing')}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-display font-bold text-sm rounded-xl transition-all"
          >
            <Crown className="w-4 h-4" />
            Upgrade to Elite — $97/mo
          </button>
        )}
      </div>

      {/* ── Change Password ───────────────────────────────── */}
      <Section
        icon={<Lock className="w-4 h-4" />}
        title="Change Password"
        subtitle="Update your account password"
        open={pwSection}
        onToggle={() => { setPwSection(o => !o); setPwMsg(null); }}
      >
        <div className="space-y-3">
          {/* New Password */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">New Password</label>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
                className={inputClass}
              />
              <button type="button" onClick={() => setShowNewPw(o => !o)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {/* Confirm Password */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
            <div className="relative">
              <input
                type={showCurPw ? 'text' : 'password'}
                value={confPw}
                onChange={e => setConfPw(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
              <button type="button" onClick={() => setShowCurPw(o => !o)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                {showCurPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {pwMsg && <Msg msg={pwMsg} />}
          <button
            onClick={handleChangePassword}
            disabled={pwLoading || !newPw || !confPw}
            className={btnPrimary}
          >
            {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Update Password
          </button>
        </div>
      </Section>

      {/* ── Change Email ──────────────────────────────────── */}
      <Section
        icon={<Mail className="w-4 h-4" />}
        title="Change Email"
        subtitle={`Current: ${user?.email}`}
        open={emSection}
        onToggle={() => { setEmSection(o => !o); setEmMsg(null); }}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">New Email Address</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
          <p className="text-xs text-gray-600">A confirmation link will be sent to your new email. Your email won't change until you click it.</p>
          {emMsg && <Msg msg={emMsg} />}
          <button
            onClick={handleChangeEmail}
            disabled={emLoading || !newEmail}
            className={btnPrimary}
          >
            {emLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Send Confirmation
          </button>
        </div>
      </Section>

      {/* ── Sign Out ──────────────────────────────────────── */}
      <div className="bg-[#111318] border border-[#1E2128] rounded-2xl overflow-hidden">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-all text-left"
        >
          <div className="p-2 rounded-xl bg-gray-800 flex-shrink-0">
            <LogOut className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="font-display font-semibold text-sm text-white">Sign Out</div>
            <div className="text-xs text-gray-500 mt-0.5">End your session on this device</div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* ── Delete Account ────────────────────────────────── */}
      <Section
        icon={<Trash2 className="w-4 h-4" />}
        title="Delete Account"
        subtitle="Permanently remove all your data"
        open={delSection}
        onToggle={() => { setDelSection(o => !o); setDelMsg(null); setDelConfirm(''); }}
        danger
      >
        <div className="space-y-3">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 leading-relaxed">
            <strong>This is permanent.</strong> Your account, all journal entries, analysis history, and education progress will be deleted immediately and cannot be recovered. If you have an active Elite subscription, cancel it in Stripe first.
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Type DELETE to confirm</label>
            <input
              type="text"
              value={delConfirm}
              onChange={e => setDelConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-[#0A0B0D] border border-red-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/60 transition-all font-mono"
            />
          </div>
          {delMsg && <Msg msg={delMsg} />}
          <button
            onClick={handleDeleteAccount}
            disabled={delLoading || delConfirm !== 'DELETE'}
            className={btnDanger + ' disabled:opacity-40'}
          >
            {delLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete My Account
          </button>
        </div>
      </Section>

      {/* Footer */}
      <p className="text-center text-gray-700 text-xs pb-4 font-data">
        NXXT Futures · Private Terminal · v1.0
      </p>
    </div>
  );
}
