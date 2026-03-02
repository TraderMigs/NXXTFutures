// v3 - No image, pure data analysis with chart_high/chart_low for overlay
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.71.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const FUTURES_CONFIGS: Record<string, {
  fullName: string; exchange: string;
  tickSize: number; tickValue: number; decimals: number; unit: string;
}> = {
  ES:  { fullName: 'E-mini S&P 500',         exchange: 'CME',   tickSize: 0.25,      tickValue: 12.50,  decimals: 2, unit: 'points' },
  NQ:  { fullName: 'E-mini Nasdaq-100',       exchange: 'CME',   tickSize: 0.25,      tickValue: 5.00,   decimals: 2, unit: 'points' },
  YM:  { fullName: 'E-mini Dow Jones',        exchange: 'CBOT',  tickSize: 1,         tickValue: 5.00,   decimals: 0, unit: 'points' },
  RTY: { fullName: 'E-mini Russell 2000',     exchange: 'CME',   tickSize: 0.10,      tickValue: 5.00,   decimals: 2, unit: 'points' },
  NKD: { fullName: 'Nikkei 225 (USD)',        exchange: 'CME',   tickSize: 5,         tickValue: 25.00,  decimals: 0, unit: 'points' },
  MES: { fullName: 'Micro E-mini S&P 500',    exchange: 'CME',   tickSize: 0.25,      tickValue: 1.25,   decimals: 2, unit: 'points' },
  MNQ: { fullName: 'Micro E-mini Nasdaq-100', exchange: 'CME',   tickSize: 0.25,      tickValue: 0.50,   decimals: 2, unit: 'points' },
  MYM: { fullName: 'Micro E-mini Dow Jones',  exchange: 'CBOT',  tickSize: 1,         tickValue: 0.50,   decimals: 0, unit: 'points' },
  M2K: { fullName: 'Micro E-mini Russell',    exchange: 'CME',   tickSize: 0.10,      tickValue: 0.50,   decimals: 2, unit: 'points' },
  GC:  { fullName: 'Gold',                    exchange: 'COMEX', tickSize: 0.10,      tickValue: 10.00,  decimals: 2, unit: 'ticks'  },
  SI:  { fullName: 'Silver',                  exchange: 'COMEX', tickSize: 0.005,     tickValue: 25.00,  decimals: 3, unit: 'ticks'  },
  HG:  { fullName: 'Copper',                  exchange: 'COMEX', tickSize: 0.0005,    tickValue: 12.50,  decimals: 4, unit: 'ticks'  },
  PL:  { fullName: 'Platinum',                exchange: 'NYMEX', tickSize: 0.10,      tickValue: 5.00,   decimals: 2, unit: 'ticks'  },
  PA:  { fullName: 'Palladium',               exchange: 'NYMEX', tickSize: 0.05,      tickValue: 5.00,   decimals: 2, unit: 'ticks'  },
  MGC: { fullName: 'Micro Gold',              exchange: 'COMEX', tickSize: 0.10,      tickValue: 1.00,   decimals: 2, unit: 'ticks'  },
  SIL: { fullName: 'Micro Silver',            exchange: 'COMEX', tickSize: 0.005,     tickValue: 1.25,   decimals: 3, unit: 'ticks'  },
  CL:  { fullName: 'Crude Oil (WTI)',         exchange: 'NYMEX', tickSize: 0.01,      tickValue: 10.00,  decimals: 2, unit: 'ticks'  },
  NG:  { fullName: 'Natural Gas',             exchange: 'NYMEX', tickSize: 0.001,     tickValue: 10.00,  decimals: 3, unit: 'ticks'  },
  RB:  { fullName: 'RBOB Gasoline',           exchange: 'NYMEX', tickSize: 0.0001,    tickValue: 4.20,   decimals: 4, unit: 'ticks'  },
  HO:  { fullName: 'Heating Oil',             exchange: 'NYMEX', tickSize: 0.0001,    tickValue: 4.20,   decimals: 4, unit: 'ticks'  },
  BZ:  { fullName: 'Brent Crude Oil',         exchange: 'NYMEX', tickSize: 0.01,      tickValue: 10.00,  decimals: 2, unit: 'ticks'  },
  MCL: { fullName: 'Micro Crude Oil',         exchange: 'NYMEX', tickSize: 0.01,      tickValue: 1.00,   decimals: 2, unit: 'ticks'  },
  ZC:  { fullName: 'Corn',                    exchange: 'CBOT',  tickSize: 0.25,      tickValue: 12.50,  decimals: 4, unit: 'ticks'  },
  ZW:  { fullName: 'Wheat',                   exchange: 'CBOT',  tickSize: 0.25,      tickValue: 12.50,  decimals: 4, unit: 'ticks'  },
  ZS:  { fullName: 'Soybeans',               exchange: 'CBOT',  tickSize: 0.25,      tickValue: 12.50,  decimals: 4, unit: 'ticks'  },
  ZL:  { fullName: 'Soybean Oil',             exchange: 'CBOT',  tickSize: 0.01,      tickValue: 6.00,   decimals: 4, unit: 'ticks'  },
  ZM:  { fullName: 'Soybean Meal',            exchange: 'CBOT',  tickSize: 0.10,      tickValue: 10.00,  decimals: 2, unit: 'ticks'  },
  KC:  { fullName: 'Coffee',                  exchange: 'ICE',   tickSize: 0.05,      tickValue: 18.75,  decimals: 4, unit: 'ticks'  },
  CT:  { fullName: 'Cotton',                  exchange: 'ICE',   tickSize: 0.01,      tickValue: 5.00,   decimals: 4, unit: 'ticks'  },
  SB:  { fullName: 'Sugar #11',               exchange: 'ICE',   tickSize: 0.01,      tickValue: 11.20,  decimals: 4, unit: 'ticks'  },
  CC:  { fullName: 'Cocoa',                   exchange: 'ICE',   tickSize: 1,         tickValue: 10.00,  decimals: 0, unit: 'ticks'  },
  LE:  { fullName: 'Live Cattle',             exchange: 'CME',   tickSize: 0.025,     tickValue: 10.00,  decimals: 3, unit: 'ticks'  },
  HE:  { fullName: 'Lean Hogs',              exchange: 'CME',   tickSize: 0.025,     tickValue: 10.00,  decimals: 3, unit: 'ticks'  },
  ZN:  { fullName: '10-Year Treasury Note',   exchange: 'CBOT',  tickSize: 0.015625,  tickValue: 15.625, decimals: 5, unit: 'ticks'  },
  ZB:  { fullName: '30-Year Treasury Bond',   exchange: 'CBOT',  tickSize: 0.03125,   tickValue: 31.25,  decimals: 5, unit: 'ticks'  },
  ZF:  { fullName: '5-Year Treasury Note',    exchange: 'CBOT',  tickSize: 0.0078125, tickValue: 7.8125, decimals: 7, unit: 'ticks'  },
  ZT:  { fullName: '2-Year Treasury Note',    exchange: 'CBOT',  tickSize: 0.00390625,tickValue: 7.8125, decimals: 8, unit: 'ticks'  },
  '6E': { fullName: 'Euro FX',               exchange: 'CME',   tickSize: 0.00005,   tickValue: 6.25,   decimals: 5, unit: 'ticks'  },
  '6J': { fullName: 'Japanese Yen',           exchange: 'CME',   tickSize: 0.0000005, tickValue: 6.25,   decimals: 7, unit: 'ticks'  },
  '6B': { fullName: 'British Pound',          exchange: 'CME',   tickSize: 0.0001,    tickValue: 6.25,   decimals: 4, unit: 'ticks'  },
  '6A': { fullName: 'Australian Dollar',      exchange: 'CME',   tickSize: 0.0001,    tickValue: 10.00,  decimals: 4, unit: 'ticks'  },
  '6C': { fullName: 'Canadian Dollar',        exchange: 'CME',   tickSize: 0.00005,   tickValue: 5.00,   decimals: 5, unit: 'ticks'  },
  '6S': { fullName: 'Swiss Franc',            exchange: 'CME',   tickSize: 0.0001,    tickValue: 12.50,  decimals: 4, unit: 'ticks'  },
  '6N': { fullName: 'New Zealand Dollar',     exchange: 'CME',   tickSize: 0.0001,    tickValue: 10.00,  decimals: 4, unit: 'ticks'  },
  BTC: { fullName: 'Bitcoin',                 exchange: 'CME',   tickSize: 5,         tickValue: 25.00,  decimals: 0, unit: 'points' },
  ETH: { fullName: 'Ether',                   exchange: 'CME',   tickSize: 0.25,      tickValue: 12.50,  decimals: 2, unit: 'points' },
  MBT: { fullName: 'Micro Bitcoin',           exchange: 'CME',   tickSize: 5,         tickValue: 2.50,   decimals: 0, unit: 'points' },
  MET: { fullName: 'Micro Ether',             exchange: 'CME',   tickSize: 0.25,      tickValue: 0.625,  decimals: 2, unit: 'points' },
};

const YF_SYMBOL_MAP: Record<string, string> = {
  ES: 'ES=F', NQ: 'NQ=F', YM: 'YM=F', RTY: 'RTY=F', NKD: 'NKD=F',
  MES: 'MES=F', MNQ: 'MNQ=F', MYM: 'MYM=F', M2K: 'M2K=F',
  GC: 'GC=F', SI: 'SI=F', HG: 'HG=F', PL: 'PL=F', PA: 'PA=F',
  MGC: 'MGC=F', SIL: 'SIL=F',
  CL: 'CL=F', NG: 'NG=F', RB: 'RB=F', HO: 'HO=F', BZ: 'BZ=F', MCL: 'MCL=F',
  ZC: 'ZC=F', ZW: 'ZW=F', ZS: 'ZS=F', ZL: 'ZL=F', ZM: 'ZM=F',
  KC: 'KC=F', CT: 'CT=F', SB: 'SB=F', CC: 'CC=F', LE: 'LE=F', HE: 'HE=F',
  ZN: 'ZN=F', ZB: 'ZB=F', ZF: 'ZF=F', ZT: 'ZT=F',
  '6E': '6E=F', '6J': '6J=F', '6B': '6B=F', '6A': '6A=F', '6C': '6C=F', '6S': '6S=F', '6N': '6N=F',
  BTC: 'BTC=F', ETH: 'ETH=F', MBT: 'MBT=F', MET: 'MET=F',
};

const TF_MAP: Record<string, { htf: string; ltf: string; htfInterval: string; ltfInterval: string; htfRange: string; ltfRange: string }> = {
  '15min': { htf: '1H',    ltf: '5M',   htfInterval: '1h',  ltfInterval: '5m',  htfRange: '730d', ltfRange: '60d'  },
  '30min': { htf: '4H',    ltf: '15M',  htfInterval: '1h',  ltfInterval: '15m', htfRange: '730d', ltfRange: '60d'  },
  '1h':    { htf: '4H',    ltf: '15M',  htfInterval: '1h',  ltfInterval: '15m', htfRange: '730d', ltfRange: '60d'  },
  '4h':    { htf: 'Daily', ltf: '1H',   htfInterval: '1d',  ltfInterval: '1h',  htfRange: '5y',   ltfRange: '730d' },
  '1day':  { htf: 'Weekly',ltf: '4H',   htfInterval: '1wk', ltfInterval: '1h',  htfRange: '10y',  ltfRange: '730d' },
  '1week': { htf: 'Weekly',ltf: 'Daily',htfInterval: '1wk', ltfInterval: '1d',  htfRange: '10y',  ltfRange: '5y'   },
};

const CHART_INTERVAL_MAP: Record<string, { interval: string; range: string }> = {
  '15min': { interval: '15m', range: '60d'  },
  '30min': { interval: '30m', range: '60d'  },
  '1h':    { interval: '1h',  range: '730d' },
  '4h':    { interval: '1h',  range: '730d' },
  '1day':  { interval: '1d',  range: '5y'   },
  '1week': { interval: '1wk', range: '10y'  },
};

interface Candle {
  datetime: string;
  open: number; high: number; low: number; close: number; volume: number;
}

async function fetchYahoo(yfSymbol: string, interval: string, range: string): Promise<any> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=${interval}&range=${range}&includePrePost=false`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status} for ${yfSymbol}`);
  return res.json();
}

function parseYahooChart(data: any): Candle[] {
  try {
    const result = data?.chart?.result?.[0];
    if (!result) return [];
    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    return timestamps
      .map((ts, i) => ({
        datetime: new Date(ts * 1000).toISOString(),
        open:   quote.open?.[i]   ?? 0,
        high:   quote.high?.[i]   ?? 0,
        low:    quote.low?.[i]    ?? 0,
        close:  quote.close?.[i]  ?? 0,
        volume: quote.volume?.[i] ?? 0,
      }))
      .filter(c => c.open !== 0 && c.close !== 0);
  } catch { return []; }
}

function calculateATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const relevant = trs.slice(-period);
  return parseFloat((relevant.reduce((a, b) => a + b, 0) / relevant.length).toFixed(6));
}

function calculatePoints(entry: number, exit: number, direction: 'BUY' | 'SELL', symbol: string): number {
  const cfg = FUTURES_CONFIGS[symbol];
  if (!cfg) return 0;
  const diff = direction === 'BUY' ? (exit - entry) : (entry - exit);
  return parseFloat((diff / cfg.tickSize).toFixed(1));
}

const SYSTEM_PROMPT = `You are an expert SMC (Smart Money Concepts) trading analyst for Futures markets.

You receive raw OHLCV candle data and must produce a precise, actionable SMC trade setup.

ANALYSIS APPROACH:
- Primary chart: analyze provided candles for the requested timeframe
- HTF context: use higher timeframe candles for overall directional bias
- LTF precision: use lower timeframe candles to refine entry zone tightly
- Current price: always provided — determines setup_status

SMC CRITERIA (apply all that are present):
1. Market Structure: BOS (Break of Structure) or ChoCh (Change of Character)
2. Order Block: Last opposing candle before the impulse move
3. Liquidity Sweep: Stop hunt above swing high / below swing low before reversal
4. FVG: 3-candle imbalance / Fair Value Gap

CONFIDENCE SCORING:
- 4 SMC elements = 90-95%
- 3 elements = 82-89%
- 2 elements = 73-79%
- 1 element = 62-70%
- HTF aligned = +2pts | HTF contradicts = -3 to -5pts
- Clean institutional level = +1-2pts | Choppy structure = -1-2pts

ENTRY ZONE RULES:
- BUY setup: entry zone MUST BE BELOW current price (pullback needed to enter)
- SELL setup: entry zone MUST BE ABOVE current price (pullback needed to enter)

SETUP STATUS:
- "PENDING": price has not yet reached the entry zone
- "AT_ENTRY": price is currently within the entry zone
- "MISSED": price has already blown past the entry zone

CHART_HIGH and CHART_LOW:
- Provide the highest high and lowest low visible in the primary chart candles
- These are used to calibrate the chart overlay drawing on the user's screenshot

RETURN ONLY VALID JSON — no markdown, no explanation:
{
  "pair": "ES",
  "timeframe": "1h",
  "higher_tf_used": "4H",
  "lower_tf_used": "15M",
  "higher_tf_bias": "4H bullish — clear BOS above 5290 swing high",
  "direction": "BUY",
  "smc_elements_confirmed": ["market_structure", "order_block", "liquidity_sweep"],
  "confidence": 87,
  "current_price": 5285.25,
  "chart_high": 5320.00,
  "chart_low": 5240.00,
  "entry_zone_min": 5271.00,
  "entry_zone_max": 5275.50,
  "tp1": 5298.00,
  "tp1_pips": 108,
  "tp2": 5312.00,
  "tp2_pips": 164,
  "tp3": 5325.00,
  "tp3_pips": 220,
  "stop_loss": 5262.00,
  "sl_pips": 52,
  "setup_status": "PENDING",
  "setup_status_note": "Price at 5285 above entry zone — waiting for retracement to OB at 5271-5275",
  "reasoning": [
    "4H BOS above 5290 swing confirms bullish structure continuation",
    "1H OB at 5271-5275 — last bearish candle before the impulse leg up",
    "Sell-side liquidity swept below 5260 swing low, smart money repositioned"
  ],
  "entry_validation": {
    "confirmation_signal": "Bullish engulfing or pin bar on 15M closing above 5271",
    "entry_trigger": "Enter on close of 15M confirmation candle",
    "invalidation_price": 5255.00,
    "invalidation_signal": "Close below 5255 on 15M cancels setup",
    "candles_to_wait": 2,
    "key_warning": null
  },
  "risk_reward": "1:2.1"
}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'No authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Decode user ID directly from JWT payload (no round-trip needed)
    let userId = 'unknown';
    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub || 'unknown';
    } catch { /* non-critical, still proceed */ }

    const body = await req.json();
    const symbol: string    = (body.symbol || 'ES').toUpperCase();
    const timeframe: string = body.timeframe || '1h';

    const cfg = FUTURES_CONFIGS[symbol];
    if (!cfg) throw new Error(`Unknown symbol: ${symbol}`);

    const yfSymbol      = YF_SYMBOL_MAP[symbol] || `${symbol}=F`;
    const tfConfig      = TF_MAP[timeframe]      || TF_MAP['1h'];
    const chartInterval = CHART_INTERVAL_MAP[timeframe] || CHART_INTERVAL_MAP['1h'];

    // Fetch all data in parallel
    const [data1m, dataChart, dataHTF, dataLTF] = await Promise.all([
      fetchYahoo(yfSymbol, '1m', '1d'),
      fetchYahoo(yfSymbol, chartInterval.interval, chartInterval.range),
      fetchYahoo(yfSymbol, tfConfig.htfInterval, tfConfig.htfRange),
      fetchYahoo(yfSymbol, tfConfig.ltfInterval, tfConfig.ltfRange),
    ]);

    const candles1m    = parseYahooChart(data1m);
    const candlesChart = parseYahooChart(dataChart);
    const candlesHTF   = parseYahooChart(dataHTF);
    const candlesLTF   = parseYahooChart(dataLTF);

    if (candles1m.length === 0 || candlesChart.length === 0) {
      throw new Error('No market data available. Market may be closed or symbol not found.');
    }

    const currentPrice = candles1m[candles1m.length - 1].close;
    const atr = calculateATR(candlesChart, 14);

    const recentChart = candlesChart.slice(-100);
    const chartHigh = Math.max(...recentChart.map(c => c.high));
    const chartLow  = Math.min(...recentChart.map(c => c.low));

    const prompt = `Analyze ${symbol} (${cfg.fullName}) on the ${timeframe} timeframe.

SYMBOL: ${symbol} | EXCHANGE: ${cfg.exchange}
CURRENT PRICE: ${currentPrice.toFixed(cfg.decimals)}
ATR(14) on ${timeframe}: ${atr}
TICK SIZE: ${cfg.tickSize} (${cfg.unit})
CHART PRICE RANGE (last 100 candles): High=${chartHigh.toFixed(cfg.decimals)} Low=${chartLow.toFixed(cfg.decimals)}

HTF CONTEXT (${tfConfig.htf} — for directional bias):
${JSON.stringify(candlesHTF.slice(-60))}

PRIMARY CHART (${timeframe}${timeframe === '4h' ? ' — fetched as 1H bars, mentally group every 4 for 4H structure' : ''}):
${JSON.stringify(recentChart)}

LTF ENTRY PRECISION (${tfConfig.ltf} — for tight entry zone):
${JSON.stringify(candlesLTF.slice(-80))}

Current price is ${currentPrice.toFixed(cfg.decimals)}.
chart_high should be approximately ${chartHigh.toFixed(cfg.decimals)} and chart_low approximately ${chartLow.toFixed(cfg.decimals)}.
Return ONLY valid JSON with no markdown.`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') throw new Error('No AI response');

    const jsonText  = textBlock.text.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON');

    let ai: any;
    try { ai = JSON.parse(jsonMatch[0]); }
    catch { throw new Error('AI returned invalid JSON'); }

    if ((ai.confidence ?? 0) < 60) throw new Error(`Low confidence (${ai.confidence}%). No tradeable setup found.`);

    const entryMid = (ai.entry_zone_min + ai.entry_zone_max) / 2;
    const slDir    = ai.direction === 'BUY' ? 'SELL' : 'BUY';
    ai.tp1_pips = calculatePoints(entryMid, ai.tp1, ai.direction, symbol);
    ai.tp2_pips = calculatePoints(entryMid, ai.tp2, ai.direction, symbol);
    ai.tp3_pips = calculatePoints(entryMid, ai.tp3, ai.direction, symbol);
    ai.sl_pips  = calculatePoints(entryMid, ai.stop_loss, slDir, symbol);
    ai.pair          = symbol;
    ai.current_price = currentPrice;
    ai.chart_high    = ai.chart_high || chartHigh;
    ai.chart_low     = ai.chart_low  || chartLow;

    // Save to Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: saved } = await supabaseAdmin.from('data_analyses').insert({
      user_id:         userId,
      symbol:          ai.pair,
      timeframe:       ai.timeframe,
      direction:       ai.direction,
      confidence_score:ai.confidence,
      entry_price:     entryMid,
      stop_loss:       ai.stop_loss,
      take_profit_1:   ai.tp1,
      take_profit_2:   ai.tp2,
      take_profit_3:   ai.tp3,
      risk_reward:     ai.risk_reward,
      reasoning:       ai.reasoning,
      setup_status:    ai.setup_status,
      higher_tf_bias:  ai.higher_tf_bias,
      created_at:      new Date().toISOString(),
    }).select().single();

    return new Response(
      JSON.stringify({ analysisId: saved?.id, analysis: { ...ai, id: saved?.id } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('analyze-chart error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
