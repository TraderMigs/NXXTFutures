import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.71.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

// ── Futures tick/point configs ─────────────────────────────────────────────────
interface FuturesTickConfig {
  tickSize: number;
  tickValue: number;
  pointValue: number;
  displayName: string;
  unit: string;
  decimals: number;
}

const FUTURES_CONFIGS: Record<string, FuturesTickConfig> = {
  // Equity Index
  ES:  { tickSize: 0.25, tickValue: 12.50, pointValue: 50,    unit: 'points', displayName: 'E-mini S&P 500',    decimals: 2 },
  NQ:  { tickSize: 0.25, tickValue: 5.00,  pointValue: 20,    unit: 'points', displayName: 'E-mini Nasdaq-100', decimals: 2 },
  YM:  { tickSize: 1,    tickValue: 5.00,  pointValue: 5,     unit: 'points', displayName: 'E-mini Dow',        decimals: 0 },
  RTY: { tickSize: 0.10, tickValue: 5.00,  pointValue: 50,    unit: 'points', displayName: 'E-mini Russell',    decimals: 2 },
  // Metals
  GC:  { tickSize: 0.10, tickValue: 10.00, pointValue: 100,   unit: 'ticks',  displayName: 'Gold',              decimals: 2 },
  SI:  { tickSize: 0.005,tickValue: 25.00, pointValue: 5000,  unit: 'ticks',  displayName: 'Silver',            decimals: 3 },
  HG:  { tickSize: 0.0005,tickValue:12.50, pointValue: 25000, unit: 'ticks',  displayName: 'Copper',            decimals: 4 },
  // Energy
  CL:  { tickSize: 0.01, tickValue: 10.00, pointValue: 1000,  unit: 'ticks',  displayName: 'Crude Oil',         decimals: 2 },
  NG:  { tickSize: 0.001,tickValue: 10.00, pointValue: 10000, unit: 'ticks',  displayName: 'Natural Gas',       decimals: 3 },
  RB:  { tickSize: 0.0001,tickValue:4.20,  pointValue: 42000, unit: 'ticks',  displayName: 'Gasoline',          decimals: 4 },
  // Agriculture
  ZC:  { tickSize: 0.25, tickValue: 12.50, pointValue: 50,    unit: 'ticks',  displayName: 'Corn',              decimals: 4 },
  ZW:  { tickSize: 0.25, tickValue: 12.50, pointValue: 50,    unit: 'ticks',  displayName: 'Wheat',             decimals: 4 },
  ZS:  { tickSize: 0.25, tickValue: 12.50, pointValue: 50,    unit: 'ticks',  displayName: 'Soybeans',          decimals: 4 },
};

// TwelveData symbol mapping for futures
const TD_SYMBOL_MAP: Record<string, string> = {
  ES: 'ES:CME', NQ: 'NQ:CME', YM: 'YM:CBOT', RTY: 'RTY:CME',
  GC: 'GC:COMEX', SI: 'SI:COMEX', HG: 'HG:COMEX',
  CL: 'CL:NYMEX', NG: 'NG:NYMEX', RB: 'RB:NYMEX',
  ZC: 'ZC:CBOT', ZW: 'ZW:CBOT', ZS: 'ZS:CBOT',
};

function getFuturesConfig(symbol: string): FuturesTickConfig {
  return FUTURES_CONFIGS[symbol.toUpperCase()] || {
    tickSize: 1, tickValue: 10, pointValue: 10, unit: 'points',
    displayName: symbol, decimals: 2,
  };
}

function calculatePoints(entry: number, exit: number, direction: 'BUY' | 'SELL', symbol: string): number {
  const cfg = getFuturesConfig(symbol);
  const diff = direction === 'BUY' ? (exit - entry) : (entry - exit);
  return parseFloat((diff / cfg.tickSize).toFixed(1));
}

async function executeToolCall(toolName: string, toolInput: Record<string, unknown>): Promise<string> {
  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  if (!apiKey) return JSON.stringify({ error: 'Market data not configured.' });

  try {
    let url: string;
    const rawSymbol = String(toolInput.symbol || '');
    const tdSymbol = TD_SYMBOL_MAP[rawSymbol.toUpperCase()] || rawSymbol;

    switch (toolName) {
      case 'get_additional_candles': {
        const timeframe = String(toolInput.timeframe || '1h');
        const count = Math.min(Number(toolInput.count) || 50, 100);
        url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=${timeframe}&outputsize=${count}&apikey=${apiKey}`;
        break;
      }
      case 'get_technical_indicator': {
        const indicator = String(toolInput.indicator || 'atr');
        const timeframe = String(toolInput.timeframe || '1h');
        const period = Number(toolInput.period) || 14;
        url = `https://api.twelvedata.com/${indicator}?symbol=${encodeURIComponent(tdSymbol)}&interval=${timeframe}&time_period=${period}&outputsize=1&apikey=${apiKey}`;
        break;
      }
      case 'get_current_price': {
        url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(tdSymbol)}&apikey=${apiKey}`;
        break;
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }

    const response = await fetch(url);
    if (!response.ok) return JSON.stringify({ error: `API status ${response.status}` });
    const data = await response.json();
    return JSON.stringify(data);
  } catch (err) {
    return JSON.stringify({ error: `Fetch failed: ${err instanceof Error ? err.message : 'Unknown'}` });
  }
}

const ANALYSIS_TOOLS = [
  {
    name: 'get_additional_candles',
    description: 'Fetch OHLCV candle data for a different timeframe or longer price history.',
    input_schema: {
      type: 'object' as const,
      properties: {
        symbol: { type: 'string' as const, description: 'Futures symbol (ES, NQ, GC, CL, etc.)' },
        timeframe: { type: 'string' as const, enum: ['1min', '5min', '15min', '30min', '1h', '4h', '1day', '1week'] },
        count: { type: 'integer' as const, description: 'Number of candles (default 50, max 100)' },
      },
      required: ['symbol', 'timeframe'],
    },
  },
  {
    name: 'get_technical_indicator',
    description: 'Fetch a technical indicator. Use ATR frequently for futures volatility context.',
    input_schema: {
      type: 'object' as const,
      properties: {
        symbol: { type: 'string' as const },
        indicator: { type: 'string' as const, enum: ['atr', 'rsi', 'ema', 'sma', 'macd'] },
        timeframe: { type: 'string' as const, enum: ['1min', '5min', '15min', '30min', '1h', '4h', '1day', '1week'] },
        period: { type: 'integer' as const },
      },
      required: ['symbol', 'indicator', 'timeframe'],
    },
  },
  {
    name: 'get_current_price',
    description: 'Fetch current live price. ALWAYS call this first.',
    input_schema: {
      type: 'object' as const,
      properties: {
        symbol: { type: 'string' as const },
      },
      required: ['symbol'],
    },
  },
];

const SYSTEM_PROMPT = `You are an expert SMC (Smart Money Concepts) trading analyst specializing in CME Futures markets.

You analyze futures contracts — equity indices (ES, NQ, YM, RTY), metals (GC, SI, HG), energy (CL, NG, RB), and agricultural commodities (ZC, ZW, ZS).

FUTURES-SPECIFIC KNOWLEDGE:
- Futures trade in points/ticks, not pips. ES moves in 0.25 point increments ($12.50/tick). NQ moves in 0.25 point increments ($5/tick). GC moves in $0.10 increments ($10/tick). CL moves in $0.01 increments ($10/tick).
- Volume on CME is real, exchange-reported data — use it in your analysis
- Institutional footprints are cleaner on futures than spot FX
- Session timing matters: NY open (9:30 AM ET) and London open are key for index futures; commodities have their own session times

MANDATORY EXECUTION ORDER:

Step 0 — LIVE PRICE FIRST:
Call get_current_price for the symbol visible in the chart. Use EXACTLY this value as current_price in your JSON.

Step 1: Read symbol and timeframe from the chart.

Step 2: Determine HTF and LTF:
  1M/3M chart  → HTF: 15min, LTF: 1min
  5M chart     → HTF: 15min, LTF: 1min
  15M chart    → HTF: 1h,    LTF: 5min
  30M chart    → HTF: 4h,    LTF: 15min
  1H chart     → HTF: 4h,    LTF: 15min
  4H chart     → HTF: 1day,  LTF: 1h
  Daily chart  → HTF: 1week, LTF: 4h

Step 3: Fetch HTF candles + LTF candles. Also fetch ATR (14-period) on the chart timeframe.

Step 4: Full SMC analysis anchored to the RIGHTMOST candle. Focus on:
- Market structure (BOS/ChoCh)
- Order blocks (institutional candles)
- Liquidity sweeps (stop hunts)
- FVG (fair value gaps / imbalances)
- Volume confirmation where visible

CONFIDENCE SCORING:
4 SMC elements = 90–95%
3 elements = 82–89%
2 elements = 73–79%
1 element  = 62–70%
0 elements = below 60%

HTF alignment adds 2pts. HTF contradiction subtracts 3-5pts. Clean institutional levels add 1-2pts. Choppy price subtracts 1-2pts.

ENTRY ZONE RULES — FUTURES PULLBACK LOGIC:
BUY setup (entry zone BELOW current price):
  current_price < entry_zone_min  → setup_status = "MISSED"
  within zone                     → setup_status = "AT_ENTRY"
  current_price > entry_zone_max  → setup_status = "PENDING"

SELL setup (entry zone ABOVE current price):
  current_price > entry_zone_max  → setup_status = "MISSED"
  within zone                     → setup_status = "AT_ENTRY"
  current_price < entry_zone_min  → setup_status = "PENDING"

RETURN ONLY VALID JSON — no markdown, no explanation outside JSON:
{
  "pair": "ES",
  "timeframe": "1h",
  "higher_tf_used": "4h",
  "lower_tf_used": "15min",
  "higher_tf_bias": "Brief description",
  "direction": "BUY",
  "smc_elements_confirmed": ["market_structure", "order_block", "liquidity_sweep"],
  "confidence": 87,
  "current_price": 5285.25,
  "chart_high": 5320.00,
  "chart_low": 5250.00,
  "entry_zone_min": 5271.00,
  "entry_zone_max": 5275.50,
  "tp1": 5298.00,
  "tp1_pips": 105,
  "tp2": 5312.00,
  "tp2_pips": 165,
  "tp3": 5325.00,
  "tp3_pips": 221,
  "stop_loss": 5262.00,
  "sl_pips": 52,
  "setup_status": "PENDING",
  "setup_status_note": "Price is above entry zone, waiting for retracement to 5271–5275",
  "reasoning": ["4H structure bullish with BOS above 5290", "Order block at 5271–5275 from impulse candle", "Liquidity sweep below 5260 swing low"],
  "entry_validation": {
    "confirmation_signal": "Bullish engulfing or pin bar closing above 5271",
    "entry_trigger": "Enter on close of confirmation candle",
    "invalidation_price": 5255.00,
    "invalidation_signal": "Close below 5255 on 15min chart cancels setup",
    "candles_to_wait": 2,
    "key_warning": "FOMC minutes at 2PM ET today — avoid entering within 30 mins of announcement"
  },
  "risk_reward": "1:2.0"
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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let formData;
    try { formData = await req.formData(); } catch {
      return new Response(JSON.stringify({ error: 'Invalid request format' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const imageFile = formData.get('image') as File;
    const userSymbol = formData.get('symbol') as string | null;

    if (!imageFile || !(imageFile instanceof File)) {
      return new Response(JSON.stringify({ error: 'No image file provided' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const imageBytes = await imageFile.arrayBuffer();
    const uint8Array = new Uint8Array(imageBytes);
    const chunkSize = 8192;
    let binary = '';
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Image = btoa(binary);
    const imageMediaType = imageFile.type as 'image/jpeg' | 'image/png';

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' });

    const messages: any[] = [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: base64Image } },
        {
          type: 'text',
          text: `Analyze this futures chart using SMC principles.

${userSymbol ? `User specified symbol: "${userSymbol}". Use this exact symbol for all API calls.` : 'Identify the futures symbol from the chart.'}

MANDATORY STEPS:
1. FIRST: Call get_current_price for the symbol.
2. Read chart symbol, timeframe, highs and lows.
3. Determine HTF and LTF per your instructions. Fetch both.
4. Also fetch ATR (14-period) on the chart timeframe.
5. Full SMC analysis anchored to RIGHTMOST candle.
6. Confidence scoring per your rules.
7. Entry window check using LIVE price from step 1.
8. Return ONLY valid JSON with no markdown wrappers.`
        }
      ]
    }];

    const MAX_TOOL_CALLS = 6;
    let toolCallCount = 0;
    let message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 3500,
      system: SYSTEM_PROMPT,
      tools: ANALYSIS_TOOLS,
      messages,
    });

    while (message.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: message.content });
      const toolResults: any[] = [];

      for (const block of message.content) {
        if (block.type !== 'tool_use') continue;
        if (toolCallCount < MAX_TOOL_CALLS) {
          const result = await executeToolCall(block.name, block.input as Record<string, unknown>);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
          toolCallCount++;
        } else {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ error: 'Tool limit reached' }) });
        }
      }

      messages.push({ role: 'user', content: toolResults });

      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 3500,
        system: SYSTEM_PROMPT,
        tools: ANALYSIS_TOOLS,
        messages,
      });

      if (toolCallCount >= MAX_TOOL_CALLS && message.stop_reason !== 'tool_use') break;
    }

    const textBlock = message.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') throw new Error('No text response from AI');

    let jsonText = textBlock.text.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON');

    let aiAnalysis;
    try { aiAnalysis = JSON.parse(jsonMatch[0]); } catch { throw new Error('AI returned invalid JSON'); }

    if (aiAnalysis.confidence < 60) throw new Error(`Low confidence (${aiAnalysis.confidence}%). No tradeable setup found.`);

    const symbol = userSymbol || aiAnalysis.pair;
    const entryMid = (aiAnalysis.entry_zone_min + aiAnalysis.entry_zone_max) / 2;

    // Calculate points using futures tick configs
    aiAnalysis.tp1_pips = calculatePoints(entryMid, aiAnalysis.tp1, aiAnalysis.direction, symbol);
    aiAnalysis.tp2_pips = calculatePoints(entryMid, aiAnalysis.tp2, aiAnalysis.direction, symbol);
    aiAnalysis.tp3_pips = calculatePoints(entryMid, aiAnalysis.tp3, aiAnalysis.direction, symbol);
    const slDir = aiAnalysis.direction === 'BUY' ? 'SELL' : 'BUY';
    aiAnalysis.sl_pips = calculatePoints(entryMid, aiAnalysis.stop_loss, slDir, symbol);

    if (userSymbol) aiAnalysis.pair = userSymbol;

    // Save to Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: saved } = await supabaseAdmin.from('data_analyses').insert({
      user_id: user.id,
      symbol: aiAnalysis.pair,
      timeframe: aiAnalysis.timeframe,
      direction: aiAnalysis.direction,
      confidence_score: aiAnalysis.confidence,
      entry_price: entryMid,
      stop_loss: aiAnalysis.stop_loss,
      take_profit_1: aiAnalysis.tp1,
      take_profit_2: aiAnalysis.tp2,
      take_profit_3: aiAnalysis.tp3,
      risk_reward: aiAnalysis.risk_reward,
      reasoning: aiAnalysis.reasoning,
      setup_status: aiAnalysis.setup_status,
      higher_tf_bias: aiAnalysis.higher_tf_bias,
      created_at: new Date().toISOString(),
    }).select().single();

    return new Response(
      JSON.stringify({
        analysisId: saved?.id,
        analysis: {
          ...aiAnalysis,
          id: saved?.id,
          setup_status: aiAnalysis.setup_status,
          setup_status_note: aiAnalysis.setup_status_note,
          higher_tf_bias: aiAnalysis.higher_tf_bias,
          entry_validation: aiAnalysis.entry_validation,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('ERROR:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
