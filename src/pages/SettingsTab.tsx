// src/pages/SettingsTab.tsx
import { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, LogOut, Trash2, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function SettingsTab() {
  const { profile, user, signOut, updatePassword, deleteAccount } = useAuth();
  const navigate = useNavigate();

  // ── Change Password ───────────────────────────────────────
  const [pwSection,   setPwSection]   = useState(false);
  const [newPw,       setNewPw]       = useState('');
  const [confPw,      setConfPw]      = useState('');
  const [showNewPw,   setShowNewPw]   = useState(false);
  const [showConfPw,  setShowConfPw]  = useState(false);
  const [pwLoading,   setPwLoading]   = useState(false);
  const [pwMsg,       setPwMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  // ── Delete Account ────────────────────────────────────────
  const [delSection,  setDelSection]  = useState(false);
  const [delConfirm,  setDelConfirm]  = useState('');
  const [delLoading,  setDelLoading]  = useState(false);
  const [delMsg,      setDelMsg]      = useState<{ ok: boolean; text: string } | null>(null);

  const handlePasswordChange = async () => {
    setPwMsg(null);
    if (newPw.length < 8) { setPwMsg({ ok: false, text: 'Password must be at least 8 characters.' }); return; }
    if (newPw !== confPw) { setPwMsg({ ok: false, text: 'Passwords do not match.' }); return; }
    setPwLoading(true);
    const { error } = await updatePassword(newPw);
    setPwLoading(false);
    if (error) { setPwMsg({ ok: false, text: error.message || 'Failed to update password.' }); return; }
    setPwMsg({ ok: true, text: 'Password updated successfully.' });
    setNewPw(''); setConfPw('');
  };

  const handleDeleteAccount = async () => {
    setDelMsg(null);
    if (delConfirm !== 'DELETE') { setDelMsg({ ok: false, text: 'Type DELETE (all caps) to confirm.' }); return; }
    setDelLoading(true);
    const { error } = await deleteAccount();
    setDelLoading(false);
    if (error) { setDelMsg({ ok: false, text: error.message || 'Failed to delete account. Contact support.' }); return; }
    navigate('/');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isElite = profile?.subscription_tier === 'elite';
  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-4">

      {/* ── Profile card ──────────────────────────────────── */}
      <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="font-display font-bold text-amber-400 text-lg">
              {profile?.email?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold text-white text-sm truncate">{profile?.email ?? user?.email}</div>
            <div className="text-xs text-gray-500 mt-0.5">Member since {joinDate}</div>
          </div>
          <span className={`flex-shrink-0 text-[10px] font-data font-bold px-2.5 py-1 rounded-full border ${
            isElite
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
          }`}>
            {isElite ? 'Elite' : 'Free'}
          </span>
        </div>

        {/* Plan summary */}
        <div className="mt-4 pt-4 border-t border-[#1E2128] grid grid-cols-3 gap-3">
          {[
            { label: 'Plan',      value: isElite ? 'Elite Trader' : 'Free Trader' },
            { label: 'Signals',   value: isElite ? 'Unlimited'    : '1 daily pick' },
            { label: 'Education', value: `${profile?.education_completion_pct ?? 0}% complete` },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</div>
              <div className="text-xs font-medium text-white">{value}</div>
            </div>
          ))}
        </div>

        {/* Upgrade CTA — free users only */}
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
      <div className="bg-[#111318] border border-[#1E2128] rounded-2xl overflow-hidden">
        <button
          onClick={() => { setPwSection(o => !o); setPwMsg(null); }}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors text-left"
        >
          <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="font-display font-semibold text-white text-sm">Change Password</div>
            <div className="text-xs text-gray-500">Update your account password</div>
          </div>
          <span className="text-gray-600 text-lg">{pwSection ? '−' : '›'}</span>
        </button>

        {pwSection && (
          <div className="px-5 pb-5 border-t border-[#1E2128] space-y-3 pt-4">
            {/* New password */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full bg-[#0A0B0D] border border-[#1E2128] rounded-xl px-4 pr-10 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
                />
                <button type="button" onClick={() => setShowNewPw(o => !o)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfPw ? 'text' : 'password'}
                  value={confPw}
                  onChange={e => setConfPw(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-[#0A0B0D] border border-[#1E2128] rounded-xl px-4 pr-10 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
                />
                <button type="button" onClick={() => setShowConfPw(o => !o)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                  {showConfPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {pwMsg && (
              <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm ${
                pwMsg.ok
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {pwMsg.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {pwMsg.text}
              </div>
            )}

            <button
              onClick={handlePasswordChange}
              disabled={pwLoading}
              className="w-full py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-display font-semibold text-sm rounded-xl transition-all"
            >
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        )}
      </div>

      {/* ── Sign Out ──────────────────────────────────────── */}
      <button
        onClick={handleSignOut}
        className="w-full bg-[#111318] border border-[#1E2128] rounded-2xl px-5 py-4 flex items-center gap-4 hover:bg-white/3 transition-colors text-left"
      >
        <div className="w-9 h-9 bg-gray-500/10 border border-gray-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <LogOut className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex-1">
          <div className="font-display font-semibold text-white text-sm">Sign Out</div>
          <div className="text-xs text-gray-500">End your session on this device</div>
        </div>
        <span className="text-gray-600 text-lg">›</span>
      </button>

      {/* ── Delete Account ────────────────────────────────── */}
      <div className="bg-[#111318] border border-red-500/10 rounded-2xl overflow-hidden">
        <button
          onClick={() => { setDelSection(o => !o); setDelMsg(null); }}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-500/5 transition-colors text-left"
        >
          <div className="w-9 h-9 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1">
            <div className="font-display font-semibold text-red-400 text-sm">Delete Account</div>
            <div className="text-xs text-gray-500">Permanently remove all your data</div>
          </div>
          <span className="text-gray-600 text-lg">{delSection ? '−' : '›'}</span>
        </button>

        {delSection && (
          <div className="px-5 pb-5 border-t border-red-500/10 space-y-3 pt-4">
            <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl text-xs text-red-300 leading-relaxed">
              This is permanent and cannot be undone. Your subscription will be cancelled automatically and all data will be deleted.
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Type <span className="text-red-400 font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={delConfirm}
                onChange={e => setDelConfirm(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-[#0A0B0D] border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-all"
              />
            </div>

            {delMsg && (
              <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm ${
                delMsg.ok
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {delMsg.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {delMsg.text}
              </div>
            )}

            <button
              onClick={handleDeleteAccount}
              disabled={delLoading || delConfirm !== 'DELETE'}
              className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 border border-red-500/30 text-red-400 font-display font-semibold text-sm rounded-xl transition-all"
            >
              {delLoading ? 'Deleting…' : 'Permanently Delete Account'}
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-gray-700 text-xs pb-4">NXXT Futures · Private Terminal · v1.0</p>
    </div>
  );
}
