import { createContext, useContext, useCallback, useState, ReactNode } from 'react';
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
  const { profile, loading: authLoading } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');

  // Derive tier directly from profile — no extra DB call needed
  const tier: 'free' | 'elite' = (profile?.subscription_tier === 'elite') ? 'elite' : 'free';

  const triggerUpgrade = useCallback((featureName = 'this feature') => {
    setUpgradeFeature(featureName);
    setShowUpgrade(true);
  }, []);

  const closeUpgrade = useCallback(() => setShowUpgrade(false), []);

  return (
    <TierContext.Provider value={{
      tier,
      isElite: tier === 'elite',
      // C4 FIX: was hardcoded false — Elite users briefly saw Free UI on load.
      // Now correctly reflects AuthContext's loading state so tier is only
      // determined once the profile has actually loaded from the database.
      isLoading: authLoading,
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
