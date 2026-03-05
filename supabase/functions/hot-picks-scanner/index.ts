// v4 - Session-gated: London 3AM-7AM EST + NY 7AM-11AM EST only. 4h universal expiry.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.71.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

// ── Futures configs ────────────────────────────────────────────────────────────
const FUTURES_CONFIGS: Record<string, {
  fullName: string; exchange: string; category: string;
  tickSize: number; tickValue: number; pointValue: number; decimals: number; unit: string;
}> = {
  ES:  { fullName: 'E-mini S&P 500',    exchange: 'CME',   category: 'EQUITY INDEX', tickSize: 0.25,   tickValue: 12.50, pointValue: 50,    decimals: 2, unit: 'points' },
  NQ:  { fullName: 'E-mini Nasdaq-100', exchange: 'CME',   category: 'EQUITY INDEX', tickSize: 0.25,   tickValue: 5.00,  pointValue: 20,    decimals: 2, unit: 'points' },
  YM:  { fullName: 'E-mini Dow Jones',  exchange: 'CBOT',  category: 'EQUITY INDEX', tickSize: 1,      tickValue: 5.00,  pointValue: 5,     decimals: 0, unit: 'points' },
  RTY: { fullName: 'E-mini Russell',    exchange: 'CME',   category: 'EQUITY INDEX', tickSize: 0.10,   tickValue: 5.00,  pointValue: 50,    decimals: 2, unit: 'points' },
  GC:  { fullName: 'Gold',              exchange: 'COMEX', category: 'METALS',       tickSize: 0.10,   tickValue: 10.00, pointValue: 100,   decimals: 2, unit: 'ticks'  },
  SI:  { fullName: 'Silver',            exchange: 'COMEX', category: 'METALS',       tickSize: 0.005,  tickValue: 25.00, pointValue: 5000,  decimals: 3, unit: 'ticks'  },
  HG:  { fullName: 'Copper',            exchange: 'COMEX', category: 'METALS',       tickSize: 0.0005, tickValue: 12.50, pointValue: 25000, decimals: 4, unit: 'ticks'  },
  CL:  { fullName: 'Crude Oil (WTI)',   exchange: 'NYMEX', category: 'ENERGY',       tickSize: 0.01,   tickValue: 10.00, pointValue: 1000,  decimals: 2, unit: 'ticks'  },
  NG:  { fullName: 'Natural Gas',       exchange: 'NYMEX', category: 'ENERGY',       tickSize: 0.001,  tickValue: 10.00, pointValue: 10000, decimals: 3, unit: 'ticks'  },
  RB:  { fullName: 'RBOB Gasoline',     exchange: 'NYMEX', category: 'ENERGY',       tickSize: 0.0001, tickValue: 4.20,  pointValue: 42000, decimals: 4, unit: 'ticks'  },
  ZC:  { fullName: 'Corn',              exchange: 'CBOT',  category: 'AGRICULTURE',  tickSize: 0.25,   tickValue: 12.50, pointValue: 50,    decimals: 4, unit: 'ticks'  },
  ZW:  { fullName: 'Wheat',             exchange: 'CBOT',  category: 'AGRICULTURE',  tickSize: 0.25,   tickValue: 12.50, pointValue: 50,    decimals: 4, unit: 'ticks'  },
  ZS:  { fullName: 'Soybeans',          exchange: 'CBOT',  category: 'AGRICULTURE',  tickSize: 0.25,   tickValue: 12.50, pointValue: 50,    decimals: 4, unit: 'ticks'  },
};

// Yahoo Finance symbol mapping
const YF_SYMBOL_MAP: Record<string, string> = {
  ES: 'ES=F', NQ: 'NQ=F', YM: 'YM=F', RTY: 'RTY=F',
  GC: 'GC=F', SI: 'SI=F', HG: 'HG=F',
  CL: 'CL=F', NG: 'NG=F', RB: 'RB=F',
  ZC: 'ZC=F', ZW: 'ZW=F', ZS: 'ZS=F',
};

// Symbols to scan — high-liquidity first
const SCAN_SYMBOLS = ['ES', 'NQ', 'GC', 'CL', 'YM', 'RTY', 'SI', 'NG', 'HG', 'RB', 'ZC', 'ZW', 'ZS'];

const SCAN_TIMEFRAME = '1h';

// ── SESSION GATE ───────────────────────────────────────────────────────────────
// PERMANENT RULE: Scanner ONLY runs during these windows (EST = UTC-5 in winter, UTC-4 in summer)
// London session: 3 AM – 7 AM EST  = 08:00 – 12:00 UTC
// NY session:     7 AM – 11 AM EST = 12:00 – 16:00 UTC
// Weekends (Saturday/Sunday UTC): always blocked
//
// NOTE: EST is UTC-5 (Nov–Mar) and EDT is UTC-4 (Mar–Nov).
// To avoid DST drift, we use slightly wider UTC windows:
//   London: 08:00–12:00 UTC covers 3AM–7AM EST in winter AND 4AM–8AM EDT in summer (close enough)
//   NY:     12:00–16:00 UTC covers 7AM–11AM EST in winter AND 8AM–12PM EDT in summer (close enough)
// This is intentional — a 1-hour drift in summer is acceptable and avoids dual cron complexity.
function isWithinTradingSession(): { allowed: boolean; session: string; reason: string } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const hourUTC = now.getUTCHours();

  // Block weekends entirely
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      allowed: false,
      session: 'WEEKEND',
      reason: `Weekend — markets closed. Next session: Monday London open (3 AM EST).`,
    };
  }

  // London session: 08:00–12:00 UTC
  if (hourUTC >= 8 && hourUTC < 12) {
    return {
      allowed: true,
      session: 'LONDON',
      reason: `London session active (${hourUTC}:00 UTC).`,
    };
  }

  // NY session: 12:00–16:00 UTC
  if (hourUTC >= 12 && hourUTC < 16) {
    return {
      allowed: true,
      session: 'NY',
      reason: `New York session active (${hourUTC}:00 UTC).`,
    };
  }

  // All other hours — blocked
  return {
    allowed: false,
    session: 'OFF_HOURS',
    reason: `Outside trading windows. Current UTC hour: ${hourUTC}. London: 08-12 UTC, NY: 12-16 UTC, Mon-Fri only.`,
  };
}

interface Candle {
  datetime: string;
  open: number; high: number; low: number; close: number; volume: number;
}

// ── Yahoo Finance helpers ──────────────────────────────────────────────────────
async function fetchYahoo(yfSymbol: string, interval: string, range: string): Promise<any> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=${interval}&range=${range}&includePrePost=false`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`Yahoo Finance status ${response.status} for ${yfSymbol}`);
  return response.json();
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
  return parseFloat((relevant.reduce((a, b) => a + b, 0) / relevant.length).toFixed(4));
}

function calculatePoints(entry: number, exit: number, direction: 'BUY' | 'SELL', symbol: string): number {
  const cfg = FUTURES_CONFIGS[symbol.toUpperCase()];
  if (!cfg) return 0;
  const diff = direction === 'BUY' ? (exit - entry) : (entry - exit);
  return parseFloat((diff / cfg.tickSize).toFixed(1));
}

// ── Fetch market data for a symbol ────────────────────────────────────────────
async function fetchSymbolData(symbol: string): Promise<{
  currentPrice: number;
  candles1h: Candle[];
  candles4h: Candle[];
  candles15m: Candle[];
  atr: number;
} | null> {
  try {
    const yfSymbol = YF_SYMBOL_MAP[symbol];
    if (!yfSymbol) return null;

    const [data1m, data1h, data15m] = await Promise.all([
      fetchYahoo(yfSymbol, '1m', '1d'),
      fetchYahoo(yfSymbol, '1h', '730d'),
      fetchYahoo(yfSymbol, '15m', '60d'),
    ]);

    const candles1m = parseYahooChart(data1m);
    const candles1h = parseYahooChart(data1h);
    const candles15m = parseYahooChart(data15m);

    if (candles1m.length === 0 || candles1h.length === 0) return null;

    const currentPrice = candles1m[candles1m.length - 1].close;
    const atr = calculateATR(candles1h, 14);

    return {
      currentPrice,
      candles1h: candles1h.slice(-100),
      candles4h: candles1h.slice(-200),
      candles15m: candles15m.slice(-80),
      atr,
    };
  } catch (err) {
    console.error(`fetchSymbolData failed for ${symbol}:`, err);
    return null;
  }
}

// ── AI Scanner system prompt ───────────────────────────────────────────────────
const SCANNER_SYSTEM_PROMPT = `You are an expert SMC (Smart Money Concepts) scanner for CME Futures markets.

You receive raw market data (OHLCV candles) for a futures symbol and must determine if there is a HIGH-QUALITY tradeable setup worth alerting traders about.

YOUR JOB:
- Analyze the 1H chart as the primary timeframe
- Use 4H candles (provided as 1H bars — group every 4 bars for 4H structure) for HTF bias
- Use 15M candles for LTF entry precision
- Apply strict SMC criteria — only flag GENUINE institutional setups

SMC CRITERIA TO LOOK FOR:
1. Market Structure: Clear BOS (Break of Structure) or ChoCh (Change of Character) on 1H
2. Order Block: Identifiable institutional candle at a key level
3. Liquidity Sweep: Stop hunt above/below a swing high/low
4. FVG: Fair Value Gap / imbalance that price may want to fill
5. HTF Alignment: 4H bias agrees with 1H setup direction

CONFIDENCE SCORING:
- 4 elements confirmed = 90-95%
- 3 elements = 82-89%
- 2 elements = 73-79%
- 1 element = 62-70%
- HTF alignment adds 2pts, HTF contradiction subtracts 3-5pts

CRITICAL COUNTER-TREND RULE:
If the trade direction CONTRADICTS the HTF bias (e.g. BUY when 4H is bearish):
- MAXIMUM confidence is 72% regardless of elements
- Set is_counter_trend: true
- Add "⚠️ COUNTER-TREND TRADE" as first reasoning point
- Include key_warning explaining the conflict

MINIMUM THRESHOLD: Only return a signal if confidence >= 75%. Counter-trend setups must still meet this threshold. If no valid setup, return {"no_setup": true, "reason": "brief reason"}.

ENTRY ZONE RULES:
BUY setup — entry zone must be BELOW current price (waiting for pullback)
SELL setup — entry zone must be ABOVE current price (waiting for pullback)
If current price is already past the entry zone, return no_setup.

NEWBIE EXPLANATION — write as if explaining to someone who has NEVER traded before. Plain English, short sentences, no jargon.

RETURN ONLY VALID JSON:
{
  "no_setup": false,
  "direction": "BUY",
  "confidence": 87,
  "is_counter_trend": false,
  "higher_tf_bias": "4H bullish — BOS above previous swing high, price in premium",
  "smc_elements_confirmed": ["market_structure", "order_block", "liquidity_sweep"],
  "entry_zone_min": 5271.00,
  "entry_zone_max": 5275.50,
  "tp1": 5298.00,
  "tp2": 5312.00,
  "tp3": 5325.00,
  "stop_loss": 5262.00,
  "setup_status": "PENDING",
  "setup_status_note": "Price above entry zone, waiting for pullback to OB at 5271-5275",
  "reasoning": [
    "4H structure bullish — BOS above 5290 swing",
    "1H OB identified at 5271-5275 from strong impulse candle",
    "Liquidity sweep below 5260 low collected sell-side liquidity"
  ],
  "entry_validation": {
    "confirmation_signal": "Bullish engulfing or pin bar on 15M closing above 5271",
    "entry_trigger": "Enter on close of confirmation candle",
    "invalidation_price": 5255.00,
    "invalidation_signal": "Close below 5255 on 15M cancels setup",
    "candles_to_wait": 2,
    "key_warning": null
  },
  "risk_reward": "1:2.1",
  "newbie": {
    "what_is_happening": "Plain English: what the market is doing right now",
    "direction_explained": "Plain English: why we buy or sell and what that means",
    "big_picture": "Plain English: what the bigger 4H chart shows",
    "entry_explained": "Plain English: what the entry zone is and why we wait for it",
    "confirmation_explained": "Plain English: exactly what candle to look for before entering",
    "stop_loss_explained": "Plain English: what the stop loss does and why it is placed there",
    "targets_explained": "Plain English: what TP1/TP2/TP3 are and what to do at each",
    "smc_elements_plain": [
      "Plain English explanation of each confirmed SMC element"
    ],
    "what_to_do_step_by_step": [
      "Step 1: ...", "Step 2: ...", "Step 3: ..."
    ],
    "risk_reality_check": "Honest plain English about risk and the R:R ratio",
    "confidence_plain": "Plain English explanation of what the confidence score means for this specific setup"
  }
}`;

// ── Scan a single symbol ───────────────────────────────────────────────────────
async function scanSymbol(symbol: string, anthropic: Anthropic): Promise<any | null> {
  const data = await fetchSymbolData(symbol);
  if (!data) return null;

  const cfg = FUTURES_CONFIGS[symbol];
  const { currentPrice, candles1h, candles4h, candles15m, atr } = data;

  const prompt = `Scan this futures symbol for a valid SMC setup.

SYMBOL: ${symbol} (${cfg.fullName})
EXCHANGE: ${cfg.exchange}
CURRENT PRICE: ${currentPrice.toFixed(cfg.decimals)}
ATR(14) on 1H: ${atr}
TICK SIZE: ${cfg.tickSize} (${cfg.unit})

4H CONTEXT (provided as 1H candles — group every 4 for 4H view):
${JSON.stringify(candles4h.slice(-40))}

1H CANDLES (primary timeframe — analyze last 100):
${JSON.stringify(candles1h)}

15M CANDLES (entry precision — last 80):
${JSON.stringify(candles15m)}

Analyze for a valid SMC setup. Only return a signal if confidence >= 75% and a genuine institutional setup exists. Return JSON only.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      system: SCANNER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;

    let rawText = textBlock.text.trim();
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    let jsonStr = jsonMatch[0];
    jsonStr = jsonStr.replace(/([":,\[\{]\s*"[^"]*?)\n([^"]*?")/g, '$1 $2');
    jsonStr = jsonStr.replace(/([":,\[\{]\s*"[^"]*?)\r([^"]*?")/g, '$1 $2');

    let result: any;
    try {
      result = JSON.parse(jsonStr);
    } catch (parseErr) {
      const lastComma = jsonStr.lastIndexOf(',');
      if (lastComma > 100) {
        const truncated = jsonStr.slice(0, lastComma) + '\n}';
        try {
          result = JSON.parse(truncated);
          console.log(`JSON truncation recovery succeeded for ${symbol}`);
        } catch {
          console.error(`JSON parse failed even after recovery for ${symbol}:`, parseErr);
          return null;
        }
      } else {
        console.error(`JSON parse failed for ${symbol}:`, parseErr);
        return null;
      }
    }

    if (result.no_setup === true) {
      console.log(`${symbol}: No setup — ${result.reason}`);
      return null;
    }

    if (!result.confidence || result.confidence < 75) {
      console.log(`${symbol}: Confidence too low (${result.confidence})`);
      return null;
    }

    result.symbol = symbol;
    result.currentPrice = currentPrice;
    return result;

  } catch (err) {
    console.error(`scanSymbol AI error for ${symbol}:`, err);
    return null;
  }
}

// ── Save signal to Supabase ────────────────────────────────────────────────────
async function saveSignal(signal: any, supabase: any): Promise<void> {
  const cfg = FUTURES_CONFIGS[signal.symbol];
  const entryMid = (signal.entry_zone_min + signal.entry_zone_max) / 2;

  // Duplicate signal guard — prevent stacking identical signals
  const entryTolerance = entryMid * 0.005;
  const { data: existing } = await supabase
    .from('futures_signals')
    .select('id, generated_at')
    .eq('symbol', signal.symbol)
    .eq('direction', signal.direction)
    .eq('status', 'ACTIVE')
    .gte('entry_zone_min', signal.entry_zone_min - entryTolerance)
    .lte('entry_zone_max', signal.entry_zone_max + entryTolerance)
    .limit(1);

  if (existing && existing.length > 0) {
    await supabase
      .from('futures_signals')
      .update({ generated_at: new Date().toISOString(), confidence: signal.confidence })
      .eq('id', existing[0].id);
    console.log(`Duplicate guard: refreshed existing ${signal.symbol} ${signal.direction} signal`);
    return;
  }

  const tp1_points = calculatePoints(entryMid, signal.tp1, signal.direction, signal.symbol);
  const tp2_points = calculatePoints(entryMid, signal.tp2, signal.direction, signal.symbol);
  const tp3_points = calculatePoints(entryMid, signal.tp3, signal.direction, signal.symbol);
  const slDir = signal.direction === 'BUY' ? 'SELL' : 'BUY';
  const sl_points = calculatePoints(entryMid, signal.stop_loss, slDir, signal.symbol);

  const now = new Date();
  // PERMANENT RULE: All signals expire after exactly 4 hours. No exceptions.
  const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  await supabase.from('futures_signals').insert({
    symbol: signal.symbol,
    exchange: cfg.exchange,
    full_name: cfg.fullName,
    timeframe: SCAN_TIMEFRAME,
    direction: signal.direction,
    confidence: signal.confidence,
    entry_zone_min: signal.entry_zone_min,
    entry_zone_max: signal.entry_zone_max,
    tp1: signal.tp1,
    tp1_points,
    tp2: signal.tp2,
    tp2_points,
    tp3: signal.tp3,
    tp3_points,
    stop_loss: signal.stop_loss,
    sl_points,
    risk_reward: signal.risk_reward,
    reasoning: signal.reasoning,
    status: 'ACTIVE',
    setup_status: signal.setup_status,
    setup_status_note: signal.setup_status_note || null,
    higher_tf_bias: signal.higher_tf_bias || null,
    entry_validation: signal.entry_validation || null,
    is_counter_trend: signal.is_counter_trend || false,
    newbie: signal.newbie || null,
    generated_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
  });

  console.log(`Saved signal: ${signal.symbol} ${signal.direction} @ ${signal.entry_zone_min}-${signal.entry_zone_max} (${signal.confidence}%) — expires in 4h`);
}

// ── Universal 4-hour expiry ────────────────────────────────────────────────────
// PERMANENT RULE: Everything expires at 4 hours. Matches our session windows.
// London signal at 3AM EST → gone by 7AM. NY signal at 7AM EST → gone by 11AM.
// No stale signals bleed into off-hours. Board is always clean.
async function expireOldSignals(supabase: any): Promise<void> {
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();

  const { error, count } = await supabase
    .from('futures_signals')
    .update({ status: 'EXPIRED', status_updated_at: now.toISOString() })
    .eq('status', 'ACTIVE')
    .lt('generated_at', fourHoursAgo);

  if (error) {
    console.error('Expiry error:', error);
  } else {
    console.log(`Expired ${count || 0} signals older than 4 hours.`);
  }
}

// ── CORS headers ───────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// ── Main handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  const startTime = Date.now();
  console.log(`Hot Picks Scanner triggered at ${new Date().toISOString()}`);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' });

    // ── SESSION GATE — check before doing anything ─────────────────────────
    const sessionCheck = isWithinTradingSession();
    console.log(`Session check: ${sessionCheck.session} — ${sessionCheck.reason}`);

    if (!sessionCheck.allowed) {
      // Still run expiry even outside session hours — keeps the board clean
      await expireOldSignals(supabaseAdmin);

      return new Response(
        JSON.stringify({
          success: true,
          session_blocked: true,
          session: sessionCheck.session,
          reason: sessionCheck.reason,
          message: 'Scanner outside trading hours. Expiry cleanup ran. No new signals generated.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Within session — proceed with full scan ────────────────────────────
    console.log(`✅ Scanning during ${sessionCheck.session} session.`);

    // Step 1: Expire old signals
    await expireOldSignals(supabaseAdmin);

    // Step 2: Scan each symbol sequentially
    const results = {
      scanned: 0,
      signals_found: 0,
      signals_saved: 0,
      errors: 0,
      yahoo_errors: 0,
      session: sessionCheck.session,
      symbols_with_signals: [] as string[],
    };

    for (const symbol of SCAN_SYMBOLS) {
      try {
        console.log(`Scanning ${symbol}...`);
        results.scanned++;

        const signal = await scanSymbol(symbol, anthropic);

        if (signal) {
          results.signals_found++;
          await saveSignal(signal, supabaseAdmin);
          results.signals_saved++;
          results.symbols_with_signals.push(`${symbol} ${signal.direction} ${signal.confidence}%`);
        }

        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (err) {
        console.error(`Error scanning ${symbol}:`, err);
        results.errors++;
        if (err instanceof Error && err.message.includes('Yahoo Finance')) {
          results.yahoo_errors++;
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Scan complete in ${elapsed}s:`, results);

    if (results.yahoo_errors >= 5) {
      try {
        await supabaseAdmin.from('admin_notifications').insert({
          type: 'SYSTEM_ERROR',
          title: 'Yahoo Finance API Degraded',
          message: `Hot Picks Scanner: ${results.yahoo_errors}/${results.scanned} symbols failed with Yahoo Finance errors. Signals may be missing.`,
          severity: 'HIGH',
          created_at: new Date().toISOString(),
          read: false,
        });
      } catch (notifErr) {
        console.error('Failed to insert admin notification:', notifErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        elapsed_seconds: parseFloat(elapsed),
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scanner fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
