import { useState, useEffect } from 'react';
import { DollarSign, Percent, RefreshCw, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AccountPanelProps {
  onSettingsChange: (balance: number, riskPercent: number) => void;
}

export function AccountPanel({ onSettingsChange }: AccountPanelProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<string>('10000');
  const [riskPercent, setRiskPercent] = useState<string>('1');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('account_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setBalance(data.account_balance.toString());
        setRiskPercent(data.risk_percent.toString());
        onSettingsChange(data.account_balance, data.risk_percent);
      }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const bal = parseFloat(balance) || 10000;
    const risk = parseFloat(riskPercent) || 1;
    setSaving(true);
    try {
      await supabase.from('account_settings').upsert({
        user_id: user.id,
        account_balance: bal,
        risk_percent: risk,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      onSettingsChange(bal, risk);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = () => {
    const bal = parseFloat(balance) || 10000;
    const risk = parseFloat(riskPercent) || 1;
    onSettingsChange(bal, risk);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const dollarRisk = ((parseFloat(balance) || 0) * (parseFloat(riskPercent) || 0)) / 100;

  return (
    <div className="bg-[#111318] border border-[#1E2128] rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-left">
            <div className="font-display font-semibold text-white text-sm">Account Settings</div>
            <div className="font-data text-xs text-gray-500">
              ${parseFloat(balance || '0').toLocaleString()} · {riskPercent}% risk · <span className="text-amber-400">${dollarRisk.toFixed(2)} per trade</span>
            </div>
          </div>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="px-5 pb-5 border-t border-[#1E2128]">
          <div className="pt-4 grid grid-cols-2 gap-3">
            {/* Balance */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Account Balance ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                <input
                  type="number"
                  value={balance}
                  onChange={e => setBalance(e.target.value)}
                  className="w-full bg-[#0A0B0D] border border-[#1E2128] rounded-xl pl-8 pr-3 py-2.5 font-data text-sm text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                  placeholder="10000"
                  min="0"
                  step="100"
                />
              </div>
            </div>

            {/* Risk % */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Risk Per Trade (%)
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                <input
                  type="number"
                  value={riskPercent}
                  onChange={e => setRiskPercent(e.target.value)}
                  className="w-full bg-[#0A0B0D] border border-[#1E2128] rounded-xl pl-8 pr-3 py-2.5 font-data text-sm text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                  placeholder="1"
                  min="0.1"
                  max="10"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          {/* Risk summary */}
          <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Max dollar risk per trade</span>
              <span className="font-data font-medium text-amber-400">${dollarRisk.toFixed(2)}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleRecalculate}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0A0B0D] border border-[#1E2128] hover:border-amber-500/30 text-gray-400 hover:text-amber-400 rounded-xl text-sm font-medium transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recalculate
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-sm font-medium transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
