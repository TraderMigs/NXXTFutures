// ── Futures Symbol Configuration ──────────────────────────────────────────────
// TwelveData format: SYMBOL:EXCHANGE

export interface FuturesConfig {
  symbol: string;           // Internal symbol (e.g. "ES")
  tdSymbol: string;         // TwelveData API symbol (e.g. "ES:CME")
  fullName: string;         // Human-readable name
  exchange: string;
  category: string;
  tickSize: number;         // Smallest price movement
  tickValue: number;        // Dollar value per tick
  pointValue: number;       // Dollar value per full point
  contractSize: number;     // Number of units per contract
  decimals: number;         // Price display decimals
  unit: string;             // "points" | "ticks"
  riskLevel: 'moderate' | 'high' | 'very_high';
  tradingHours: string;     // Human-readable trading hours
}

export const FUTURES_SYMBOLS: FuturesConfig[] = [
  // ── Equity Index ──────────────────────────────────────────────────────────
  {
    symbol: 'ES', tdSymbol: 'ES:CME', fullName: 'E-mini S&P 500',
    exchange: 'CME', category: 'EQUITY INDEX',
    tickSize: 0.25, tickValue: 12.50, pointValue: 50, contractSize: 1,
    decimals: 2, unit: 'points', riskLevel: 'moderate', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'NQ', tdSymbol: 'NQ:CME', fullName: 'E-mini Nasdaq-100',
    exchange: 'CME', category: 'EQUITY INDEX',
    tickSize: 0.25, tickValue: 5.00, pointValue: 20, contractSize: 1,
    decimals: 2, unit: 'points', riskLevel: 'high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'YM', tdSymbol: 'YM:CBOT', fullName: 'E-mini Dow Jones',
    exchange: 'CBOT', category: 'EQUITY INDEX',
    tickSize: 1, tickValue: 5.00, pointValue: 5, contractSize: 1,
    decimals: 0, unit: 'points', riskLevel: 'moderate', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'RTY', tdSymbol: 'RTY:CME', fullName: 'E-mini Russell 2000',
    exchange: 'CME', category: 'EQUITY INDEX',
    tickSize: 0.10, tickValue: 5.00, pointValue: 50, contractSize: 1,
    decimals: 2, unit: 'points', riskLevel: 'high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  // ── Metals ────────────────────────────────────────────────────────────────
  {
    symbol: 'GC', tdSymbol: 'GC:COMEX', fullName: 'Gold',
    exchange: 'COMEX', category: 'METALS',
    tickSize: 0.10, tickValue: 10.00, pointValue: 100, contractSize: 100,
    decimals: 2, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'SI', tdSymbol: 'SI:COMEX', fullName: 'Silver',
    exchange: 'COMEX', category: 'METALS',
    tickSize: 0.005, tickValue: 25.00, pointValue: 5000, contractSize: 5000,
    decimals: 3, unit: 'ticks', riskLevel: 'high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'HG', tdSymbol: 'HG:COMEX', fullName: 'Copper',
    exchange: 'COMEX', category: 'METALS',
    tickSize: 0.0005, tickValue: 12.50, pointValue: 25000, contractSize: 25000,
    decimals: 4, unit: 'ticks', riskLevel: 'high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  // ── Energy ────────────────────────────────────────────────────────────────
  {
    symbol: 'CL', tdSymbol: 'CL:NYMEX', fullName: 'Crude Oil (WTI)',
    exchange: 'NYMEX', category: 'ENERGY',
    tickSize: 0.01, tickValue: 10.00, pointValue: 1000, contractSize: 1000,
    decimals: 2, unit: 'ticks', riskLevel: 'high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'NG', tdSymbol: 'NG:NYMEX', fullName: 'Natural Gas',
    exchange: 'NYMEX', category: 'ENERGY',
    tickSize: 0.001, tickValue: 10.00, pointValue: 10000, contractSize: 10000,
    decimals: 3, unit: 'ticks', riskLevel: 'very_high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  {
    symbol: 'RB', tdSymbol: 'RB:NYMEX', fullName: 'RBOB Gasoline',
    exchange: 'NYMEX', category: 'ENERGY',
    tickSize: 0.0001, tickValue: 4.20, pointValue: 42000, contractSize: 42000,
    decimals: 4, unit: 'ticks', riskLevel: 'very_high', tradingHours: 'Sun-Fri 6pm-5pm ET',
  },
  // ── Agriculture ───────────────────────────────────────────────────────────
  {
    symbol: 'ZC', tdSymbol: 'ZC:CBOT', fullName: 'Corn',
    exchange: 'CBOT', category: 'AGRICULTURE',
    tickSize: 0.25, tickValue: 12.50, pointValue: 50, contractSize: 5000,
    decimals: 4, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Mon-Fri 8:30am-1:20pm CT',
  },
  {
    symbol: 'ZW', tdSymbol: 'ZW:CBOT', fullName: 'Wheat',
    exchange: 'CBOT', category: 'AGRICULTURE',
    tickSize: 0.25, tickValue: 12.50, pointValue: 50, contractSize: 5000,
    decimals: 4, unit: 'ticks', riskLevel: 'high', tradingHours: 'Mon-Fri 8:30am-1:20pm CT',
  },
  {
    symbol: 'ZS', tdSymbol: 'ZS:CBOT', fullName: 'Soybeans',
    exchange: 'CBOT', category: 'AGRICULTURE',
    tickSize: 0.25, tickValue: 12.50, pointValue: 50, contractSize: 5000,
    decimals: 4, unit: 'ticks', riskLevel: 'moderate', tradingHours: 'Mon-Fri 8:30am-1:20pm CT',
  },
];

// Symbol lookup by internal symbol
export const FUTURES_MAP: Record<string, FuturesConfig> = Object.fromEntries(
  FUTURES_SYMBOLS.map(s => [s.symbol, s])
);

// Categories for display grouping
export const FUTURES_CATEGORIES = [
  'EQUITY INDEX',
  'METALS',
  'ENERGY',
  'AGRICULTURE',
];

// Format a price for display based on symbol config
export function formatFuturesPrice(price: number, symbol: string): string {
  const config = FUTURES_MAP[symbol];
  if (!config) return price.toFixed(2);
  return price.toFixed(config.decimals);
}

// Calculate dollar value of move from entry to target
export function calcDollarValue(points: number, symbol: string): number {
  const config = FUTURES_MAP[symbol];
  if (!config) return 0;
  return Math.abs(points) * config.pointValue;
}

// Calculate contracts based on account/risk
export function calcContracts(
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number,
  symbol: string
): { contracts: number; dollarRisk: number; marginEstimate: number } {
  const config = FUTURES_MAP[symbol];
  if (!config) return { contracts: 1, dollarRisk: 0, marginEstimate: 0 };

  const dollarRiskAllowed = (accountBalance * riskPercent) / 100;
  const priceDiff = Math.abs(entryPrice - stopLoss);
  const dollarRiskPerContract = (priceDiff / config.tickSize) * config.tickValue;

  if (dollarRiskPerContract === 0) return { contracts: 1, dollarRisk: 0, marginEstimate: 0 };

  const contracts = Math.floor(dollarRiskAllowed / dollarRiskPerContract);
  const actualContracts = Math.max(1, contracts);
  const actualDollarRisk = actualContracts * dollarRiskPerContract;

  // Rough margin estimate (typically 5-10% of notional)
  const notional = entryPrice * config.contractSize;
  const marginEstimate = notional * 0.07 * actualContracts;

  return {
    contracts: actualContracts,
    dollarRisk: Math.round(actualDollarRisk * 100) / 100,
    marginEstimate: Math.round(marginEstimate),
  };
}
