// ── Futures Symbol Configuration ──────────────────────────────────────────────

export interface FuturesConfig {
  symbol: string;
  yfSymbol: string;       // Yahoo Finance symbol (=F format)
  fullName: string;
  exchange: string;
  category: string;
  tickSize: number;
  tickValue: number;
  pointValue: number;
  contractSize: number;
  decimals: number;
  unit: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  tradingHours: string;
  isMicro?: boolean;
}

export const FUTURES_SYMBOLS: FuturesConfig[] = [

  // ── Equity Index — Standard ────────────────────────────────────────────────
  {
    symbol: 'ES',  yfSymbol: 'ES=F',  fullName: 'E-mini S&P 500',
    exchange: 'CME', category: 'EQUITY INDEX',
    tickSize: 0.25, tickValue: 12.50, pointValue: 50, contractSize: 1,
    decimals: 2, unit: 'points', riskLevel: 'moderate', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'NQ',  yfSymbol: 'NQ=F',  fullName: 'E-mini Nasdaq-100',
    exchange: 'CME', category: 'EQUITY INDEX',
    tickSize: 0.25, tickValue: 5.00, pointValue: 20, contractSize: 1,
    decimals: 2, unit: 'points', riskLevel: 'high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'YM',  yfSymbol: 'YM=F',  fullName: 'E-mini Dow Jones',
    exchange: 'CBOT', category: 'EQUITY INDEX',
    tickSize: 1, tickValue: 5.00, pointValue: 5, contractSize: 1,
    decimals: 0, unit: 'points', riskLevel: 'moderate', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'RTY', yfSymbol: 'RTY=F', fullName: 'E-mini Russell 2000',
    exchange: 'CME', category: 'EQUITY INDEX',
    tickSize: 0.10, tickValue: 5.00, pointValue: 50, contractSize: 1,
    decimals: 2, unit: 'points', riskLevel: 'high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'NKD', yfSymbol: 'NKD=F', fullName: 'Nikkei 225 (USD)',
    exchange: 'CME', category: 'EQUITY INDEX',
    tickSize: 5, tickValue: 25.00, pointValue: 5, contractSize: 1,
    decimals: 0, unit: 'points', riskLevel: 'high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },

  // ── Equity Index — Micro ───────────────────────────────────────────────────
  {
    symbol: 'MES', yfSymbol: 'MES=F', fullName: 'Micro E-mini S&P 500',
    exchange: 'CME', category: 'EQUITY INDEX',
    tickSize: 0.25, tickValue: 1.25, pointValue: 5, contractSize: 1,
    decimals: 2, unit: 'points', riskLevel: 'low', tradingHours: 'Sun-Fri 6pm-5pm ET', isMicro: true,
  },
  {
    symbol: 'MNQ', yfSymbol: 'MNQ=F', fullName: 'Micro E-mini Nasdaq-100',
    exchange: 'CME', category: 'EQUITY INDEX',
    tickSize: 0.25, tickValue: 0.50, pointValue: 2, contractSize: 1,
    decimals: 2, unit: 'points', riskLevel: 'low', tradingHours: 'Sun-Fri 6pm-5pm ET', isMicro: true,
  },
  {
    symbol: 'MYM', yfSymbol: 'MYM=F', fullName: 'Micro E-mini Dow Jones',
    exchange: 'CBOT', category: 'EQUITY INDEX',
    tickSize: 1, tickValue: 0.50, pointValue: 0.50, contractSize: 1,
    decimals: 0, unit: 'points', riskLevel: 'low', tradingHours: 'Sun-Fri 6pm-5pm ET', isMicro: true,
  },
  {
    symbol: 'M2K', yfSymbol: 'M2K=F', fullName: 'Micro E-mini Russell 2000',
    exchange: 'CME', category: 'EQUITY INDEX',
    tickSize: 0.10, tickValue: 0.50, pointValue: 5, contractSize: 1,
    decimals: 2, unit: 'points', riskLevel: 'low', tradingHours: 'Sun-Fri 6pm-5pm ET', isMicro: true,
  },

  // ── Metals — Standard ─────────────────────────────────────────────────────
  {
    symbol: 'GC',  yfSymbol: 'GC=F',  fullName: 'Gold',
    exchange: 'COMEX', category: 'METALS',
    tickSize: 0.10, tickValue: 10.00, pointValue: 100, contractSize: 100,
    decimals: 2, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'SI',  yfSymbol: 'SI=F',  fullName: 'Silver',
    exchange: 'COMEX', category: 'METALS',
    tickSize: 0.005, tickValue: 25.00, pointValue: 5000, contractSize: 5000,
    decimals: 3, unit: 'ticks', riskLevel: 'high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'HG',  yfSymbol: 'HG=F',  fullName: 'Copper',
    exchange: 'COMEX', category: 'METALS',
    tickSize: 0.0005, tickValue: 12.50, pointValue: 25000, contractSize: 25000,
    decimals: 4, unit: 'ticks', riskLevel: 'high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'PL',  yfSymbol: 'PL=F',  fullName: 'Platinum',
    exchange: 'NYMEX', category: 'METALS',
    tickSize: 0.10, tickValue: 5.00, pointValue: 50, contractSize: 50,
    decimals: 2, unit: 'ticks', riskLevel: 'high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'PA',  yfSymbol: 'PA=F',  fullName: 'Palladium',
    exchange: 'NYMEX', category: 'METALS',
    tickSize: 0.05, tickValue: 5.00, pointValue: 100, contractSize: 100,
    decimals: 2, unit: 'ticks', riskLevel: 'very_high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },

  // ── Metals — Micro ────────────────────────────────────────────────────────
  {
    symbol: 'MGC', yfSymbol: 'MGC=F', fullName: 'Micro Gold',
    exchange: 'COMEX', category: 'METALS',
    tickSize: 0.10, tickValue: 1.00, pointValue: 10, contractSize: 10,
    decimals: 2, unit: 'ticks', riskLevel: 'low', tradingHours: 'Sun-Fri 6pm-5pm ET', isMicro: true,
  },
  {
    symbol: 'SIL', yfSymbol: 'SIL=F', fullName: 'Micro Silver',
    exchange: 'COMEX', category: 'METALS',
    tickSize: 0.005, tickValue: 1.25, pointValue: 250, contractSize: 1000,
    decimals: 3, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Sun-Fri 6pm-5pm ET', isMicro: true,
  },

  // ── Energy — Standard ─────────────────────────────────────────────────────
  {
    symbol: 'CL',  yfSymbol: 'CL=F',  fullName: 'Crude Oil (WTI)',
    exchange: 'NYMEX', category: 'ENERGY',
    tickSize: 0.01, tickValue: 10.00, pointValue: 1000, contractSize: 1000,
    decimals: 2, unit: 'ticks', riskLevel: 'high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'NG',  yfSymbol: 'NG=F',  fullName: 'Natural Gas',
    exchange: 'NYMEX', category: 'ENERGY',
    tickSize: 0.001, tickValue: 10.00, pointValue: 10000, contractSize: 10000,
    decimals: 3, unit: 'ticks', riskLevel: 'very_high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'RB',  yfSymbol: 'RB=F',  fullName: 'RBOB Gasoline',
    exchange: 'NYMEX', category: 'ENERGY',
    tickSize: 0.0001, tickValue: 4.20, pointValue: 42000, contractSize: 42000,
    decimals: 4, unit: 'ticks', riskLevel: 'very_high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'HO',  yfSymbol: 'HO=F',  fullName: 'Heating Oil',
    exchange: 'NYMEX', category: 'ENERGY',
    tickSize: 0.0001, tickValue: 4.20, pointValue: 42000, contractSize: 42000,
    decimals: 4, unit: 'ticks', riskLevel: 'very_high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'BZ',  yfSymbol: 'BZ=F',  fullName: 'Brent Crude Oil',
    exchange: 'NYMEX', category: 'ENERGY',
    tickSize: 0.01, tickValue: 10.00, pointValue: 1000, contractSize: 1000,
    decimals: 2, unit: 'ticks', riskLevel: 'high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },

  // ── Energy — Micro ────────────────────────────────────────────────────────
  {
    symbol: 'MCL', yfSymbol: 'MCL=F', fullName: 'Micro Crude Oil (WTI)',
    exchange: 'NYMEX', category: 'ENERGY',
    tickSize: 0.01, tickValue: 1.00, pointValue: 100, contractSize: 100,
    decimals: 2, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Sun-Fri 6pm-5pm ET', isMicro: true,
  },

  // ── Agriculture ───────────────────────────────────────────────────────────
  {
    symbol: 'ZC',  yfSymbol: 'ZC=F',  fullName: 'Corn',
    exchange: 'CBOT', category: 'AGRICULTURE',
    tickSize: 0.25, tickValue: 12.50, pointValue: 50, contractSize: 5000,
    decimals: 4, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Mon-Fri 8:30am-1:20pm CT',
  },
  {
    symbol: 'ZW',  yfSymbol: 'ZW=F',  fullName: 'Wheat',
    exchange: 'CBOT', category: 'AGRICULTURE',
    tickSize: 0.25, tickValue: 12.50, pointValue: 50, contractSize: 5000,
    decimals: 4, unit: 'ticks', riskLevel: 'high', tradingHours: 'Mon-Fri 8:30am-1:20pm CT',
  },
  {
    symbol: 'ZS',  yfSymbol: 'ZS=F',  fullName: 'Soybeans',
    exchange: 'CBOT', category: 'AGRICULTURE',
    tickSize: 0.25, tickValue: 12.50, pointValue: 50, contractSize: 5000,
    decimals: 4, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Mon-Fri 8:30am-1:20pm CT',
  },
  {
    symbol: 'ZL',  yfSymbol: 'ZL=F',  fullName: 'Soybean Oil',
    exchange: 'CBOT', category: 'AGRICULTURE',
    tickSize: 0.01, tickValue: 6.00, pointValue: 600, contractSize: 60000,
    decimals: 4, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Mon-Fri 8:30am-1:20pm CT',
  },
  {
    symbol: 'ZM',  yfSymbol: 'ZM=F',  fullName: 'Soybean Meal',
    exchange: 'CBOT', category: 'AGRICULTURE',
    tickSize: 0.10, tickValue: 10.00, pointValue: 100, contractSize: 100,
    decimals: 2, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Mon-Fri 8:30am-1:20pm CT',
  },
  {
    symbol: 'KC',  yfSymbol: 'KC=F',  fullName: 'Coffee',
    exchange: 'ICE', category: 'AGRICULTURE',
    tickSize: 0.05, tickValue: 18.75, pointValue: 375, contractSize: 37500,
    decimals: 4, unit: 'ticks', riskLevel: 'high', tradingHours: 'Mon-Fri 3:15am-1:30pm ET',
  },
  {
    symbol: 'CT',  yfSymbol: 'CT=F',  fullName: 'Cotton',
    exchange: 'ICE', category: 'AGRICULTURE',
    tickSize: 0.01, tickValue: 5.00, pointValue: 500, contractSize: 50000,
    decimals: 4, unit: 'ticks', riskLevel: 'high', tradingHours: 'Mon-Fri 2:30am-2:20pm ET',
  },
  {
    symbol: 'SB',  yfSymbol: 'SB=F',  fullName: 'Sugar #11',
    exchange: 'ICE', category: 'AGRICULTURE',
    tickSize: 0.01, tickValue: 11.20, pointValue: 1120, contractSize: 112000,
    decimals: 4, unit: 'ticks', riskLevel: 'high', tradingHours: 'Mon-Fri 2:30am-1pm ET',
  },
  {
    symbol: 'CC',  yfSymbol: 'CC=F',  fullName: 'Cocoa',
    exchange: 'ICE', category: 'AGRICULTURE',
    tickSize: 1, tickValue: 10.00, pointValue: 10, contractSize: 10,
    decimals: 0, unit: 'ticks', riskLevel: 'high', tradingHours: 'Mon-Fri 4:45am-1pm ET',
  },
  {
    symbol: 'LE',  yfSymbol: 'LE=F',  fullName: 'Live Cattle',
    exchange: 'CME', category: 'AGRICULTURE',
    tickSize: 0.025, tickValue: 10.00, pointValue: 400, contractSize: 40000,
    decimals: 3, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Mon-Fri 8:30am-1:05pm CT',
  },
  {
    symbol: 'HE',  yfSymbol: 'HE=F',  fullName: 'Lean Hogs',
    exchange: 'CME', category: 'AGRICULTURE',
    tickSize: 0.025, tickValue: 10.00, pointValue: 400, contractSize: 40000,
    decimals: 3, unit: 'ticks', riskLevel: 'high', tradingHours: 'Mon-Fri 8:30am-1:05pm CT',
  },

  // ── Interest Rates ────────────────────────────────────────────────────────
  {
    symbol: 'ZN',  yfSymbol: 'ZN=F',  fullName: '10-Year Treasury Note',
    exchange: 'CBOT', category: 'RATES',
    tickSize: 0.015625, tickValue: 15.625, pointValue: 1000, contractSize: 100000,
    decimals: 5, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'ZB',  yfSymbol: 'ZB=F',  fullName: '30-Year Treasury Bond',
    exchange: 'CBOT', category: 'RATES',
    tickSize: 0.03125, tickValue: 31.25, pointValue: 1000, contractSize: 100000,
    decimals: 5, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'ZF',  yfSymbol: 'ZF=F',  fullName: '5-Year Treasury Note',
    exchange: 'CBOT', category: 'RATES',
    tickSize: 0.0078125, tickValue: 7.8125, pointValue: 1000, contractSize: 100000,
    decimals: 7, unit: 'ticks', riskLevel: 'low', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'ZT',  yfSymbol: 'ZT=F',  fullName: '2-Year Treasury Note',
    exchange: 'CBOT', category: 'RATES',
    tickSize: 0.00390625, tickValue: 7.8125, pointValue: 2000, contractSize: 200000,
    decimals: 8, unit: 'ticks', riskLevel: 'low', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },

  // ── FX Futures ────────────────────────────────────────────────────────────
  {
    symbol: '6E',  yfSymbol: '6E=F',  fullName: 'Euro FX',
    exchange: 'CME', category: 'FX',
    tickSize: 0.00005, tickValue: 6.25, pointValue: 125000, contractSize: 125000,
    decimals: 5, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Sun-Fri 5pm-4pm ET',
  },
  {
    symbol: '6J',  yfSymbol: '6J=F',  fullName: 'Japanese Yen',
    exchange: 'CME', category: 'FX',
    tickSize: 0.0000005, tickValue: 6.25, pointValue: 12500000, contractSize: 12500000,
    decimals: 7, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Sun-Fri 5pm-4pm ET',
  },
  {
    symbol: '6B',  yfSymbol: '6B=F',  fullName: 'British Pound',
    exchange: 'CME', category: 'FX',
    tickSize: 0.0001, tickValue: 6.25, pointValue: 62500, contractSize: 62500,
    decimals: 4, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Sun-Fri 5pm-4pm ET',
  },
  {
    symbol: '6A',  yfSymbol: '6A=F',  fullName: 'Australian Dollar',
    exchange: 'CME', category: 'FX',
    tickSize: 0.0001, tickValue: 10.00, pointValue: 100000, contractSize: 100000,
    decimals: 4, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Sun-Fri 5pm-4pm ET',
  },
  {
    symbol: '6C',  yfSymbol: '6C=F',  fullName: 'Canadian Dollar',
    exchange: 'CME', category: 'FX',
    tickSize: 0.00005, tickValue: 5.00, pointValue: 100000, contractSize: 100000,
    decimals: 5, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Sun-Fri 5pm-4pm ET',
  },
  {
    symbol: '6S',  yfSymbol: '6S=F',  fullName: 'Swiss Franc',
    exchange: 'CME', category: 'FX',
    tickSize: 0.0001, tickValue: 12.50, pointValue: 125000, contractSize: 125000,
    decimals: 4, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Sun-Fri 5pm-4pm ET',
  },
  {
    symbol: '6N',  yfSymbol: '6N=F',  fullName: 'New Zealand Dollar',
    exchange: 'CME', category: 'FX',
    tickSize: 0.0001, tickValue: 10.00, pointValue: 100000, contractSize: 100000,
    decimals: 4, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Sun-Fri 5pm-4pm ET',
  },

  // ── Crypto ────────────────────────────────────────────────────────────────
  {
    symbol: 'BTC',  yfSymbol: 'BTC=F',  fullName: 'Bitcoin',
    exchange: 'CME', category: 'CRYPTO',
    tickSize: 5, tickValue: 25.00, pointValue: 5, contractSize: 5,
    decimals: 0, unit: 'points', riskLevel: 'very_high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'ETH',  yfSymbol: 'ETH=F',  fullName: 'Ether',
    exchange: 'CME', category: 'CRYPTO',
    tickSize: 0.25, tickValue: 12.50, pointValue: 50, contractSize: 50,
    decimals: 2, unit: 'points', riskLevel: 'very_high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'MBT',  yfSymbol: 'MBT=F',  fullName: 'Micro Bitcoin',
    exchange: 'CME', category: 'CRYPTO',
    tickSize: 5, tickValue: 2.50, pointValue: 0.50, contractSize: 0.10,
    decimals: 0, unit: 'points', riskLevel: 'very_high', tradingHours: 'Sun-Fri 6pm-5pm ET', isMicro: true,
  },
  {
    symbol: 'MET',  yfSymbol: 'MET=F',  fullName: 'Micro Ether',
    exchange: 'CME', category: 'CRYPTO',
    tickSize: 0.25, tickValue: 0.625, pointValue: 2.50, contractSize: 2.5,
    decimals: 2, unit: 'points', riskLevel: 'very_high', tradingHours: 'Sun-Fri 6pm-5pm ET', isMicro: true,
  },
];

// Symbol lookup
export const FUTURES_MAP: Record<string, FuturesConfig> = Object.fromEntries(
  FUTURES_SYMBOLS.map(s => [s.symbol, s])
);

// Yahoo Finance symbol lookup (reverse map)
export const YF_MAP: Record<string, string> = Object.fromEntries(
  FUTURES_SYMBOLS.map(s => [s.symbol, s.yfSymbol])
);

// All categories
export const FUTURES_CATEGORIES = [
  'EQUITY INDEX',
  'METALS',
  'ENERGY',
  'AGRICULTURE',
  'RATES',
  'FX',
  'CRYPTO',
];

export function formatFuturesPrice(price: number, symbol: string): string {
  const config = FUTURES_MAP[symbol];
  if (!config) return price.toFixed(2);
  return price.toFixed(config.decimals);
}

export function calcDollarValue(points: number, symbol: string): number {
  const config = FUTURES_MAP[symbol];
  if (!config) return 0;
  return Math.abs(points) * config.pointValue;
}

export function calcContracts(
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number,
  symbol: string
): {
  contracts: number;
  dollarRisk: number;
  marginEstimate: number;
  dollarRiskPerContract: number;
  dollarRiskAllowed: number;
  overBudget: boolean;
} {
  const config = FUTURES_MAP[symbol];
  if (!config) return { contracts: 1, dollarRisk: 0, marginEstimate: 0, dollarRiskPerContract: 0, dollarRiskAllowed: 0, overBudget: false };

  const dollarRiskAllowed  = (accountBalance * riskPercent) / 100;
  const priceDiff          = Math.abs(entryPrice - stopLoss);
  const dollarRiskPerContract = (priceDiff / config.tickSize) * config.tickValue;

  if (dollarRiskPerContract === 0) return { contracts: 1, dollarRisk: 0, marginEstimate: 0, dollarRiskPerContract: 0, dollarRiskAllowed, overBudget: false };

  const contracts       = Math.floor(dollarRiskAllowed / dollarRiskPerContract);
  const actualContracts = Math.max(1, contracts);
  const actualDollarRisk = actualContracts * dollarRiskPerContract;
  const overBudget      = actualDollarRisk > dollarRiskAllowed;

  // Use pointValue for notional — correct for index futures (ES=0/pt, MES=/pt)
  // For commodities pointValue matches contractSize so result is the same
  const notional        = entryPrice * config.pointValue;
  const marginEstimate  = notional * 0.07 * actualContracts;

  return {
    contracts:             actualContracts,
    dollarRisk:            Math.round(actualDollarRisk * 100) / 100,
    marginEstimate:        Math.round(marginEstimate),
    dollarRiskPerContract: Math.round(dollarRiskPerContract * 100) / 100,
    dollarRiskAllowed:     Math.round(dollarRiskAllowed * 100) / 100,
    overBudget,
  };
}
