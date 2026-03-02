import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface TierContextType {
  tier: 'free' | 'elite';
  isElite: boolean;
  isLoading: boolean;
  showUpgrade: boolean;
  upgradeFeature: string;
  triggerUpgrade: (featureName?: string) => void;
  closeUpgrade: () => void;
}

const TierContext = createContext<TierContextType | undefined>(undefined);

export function TierProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tier, setTier]               = useState<'free' | 'elite'>('free');
  const [isLoading, setIsLoading]     = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');

  const fetchTier = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    const { data } = await supabase
      .from('user_profiles')
      .select('tier')
      .eq('id', user.id)
      .single();
    if (data) setTier(data.tier as 'free' | 'elite');
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchTier(); }, [fetchTier]);

  const triggerUpgrade = useCallback((featureName = 'this feature') => {
    setUpgradeFeature(featureName);
    setShowUpgrade(true);
  }, []);

  const closeUpgrade = useCallback(() => setShowUpgrade(false), []);

  return (
    <TierContext.Provider value={{
      tier,
      isElite: tier === 'elite',
      isLoading,
      showUpgrade,
      upgradeFeature,
      triggerUpgrade,
      closeUpgrade,
    }}>
      {children}
    </TierContext.Provider>
  );
}

export function useTier() {
  const ctx = useContext(TierContext);
  if (!ctx) throw new Error('useTier must be used within TierProvider');
  return ctx;
}
