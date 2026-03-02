import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Types ─────────────────────────────────────────────────────────────────────

export type FuturesSignal = {
  id: string;
  symbol: string;            // e.g. "ES", "NQ", "GC"
  exchange: string;          // e.g. "CME", "COMEX", "NYMEX"
  full_name: string;         // e.g. "E-mini S&P 500"
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry_zone_min: number;
  entry_zone_max: number;
  tp1: number;
  tp1_points: number;
  tp2: number;
  tp2_points: number;
  tp3: number;
  tp3_points: number;
  stop_loss: number;
  sl_points: number;
  risk_reward: string;
  reasoning: string[];
  status: 'ACTIVE' | 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT' | 'STOPPED_OUT' | 'EXPIRED';
  setup_status: 'PENDING' | 'AT_ENTRY' | 'MISSED';
  setup_status_note: string | null;
  higher_tf_bias: string | null;
  entry_validation: {
    confirmation_signal?: string;
    entry_trigger?: string;
    invalidation_price?: number;
    invalidation_signal?: string;
    candles_to_wait?: number;
    key_warning?: string;
  } | null;
  current_price: number | null;
  current_pnl_points: number | null;
  session: 'ASIA' | 'LONDON' | 'NY' | 'OFF';
  atr_value: number | null;
  news_warning: boolean;
  news_warning_note: string | null;
  tick_size: number;
  tick_value: number;
  point_value: number;
  contract_size: number;
  generated_at: string;
  expires_at: string | null;
  status_updated_at: string | null;
  created_at: string;
  is_counter_trend?: boolean;
  newbie?: {
    what_is_happening: string;
    direction_explained: string;
    big_picture: string;
    entry_explained: string;
    confirmation_explained: string;
    stop_loss_explained: string;
    targets_explained: string;
    smc_elements_plain: string[];
    what_to_do_step_by_step: string[];
    risk_reality_check: string;
    confidence_plain: string;
  } | null;
};

export type AccountSettings = {
  id: string;
  user_id: string;
  account_balance: number;
  risk_percent: number;
  htf_bias_lock: 'BULLISH' | 'BEARISH' | 'OFF';
  updated_at: string;
};

export type DataAnalysis = {
  id: string;
  user_id: string;
  symbol: string;
  timeframe: string | null;
  direction: string | null;
  confidence: number | null;
  current_price: number | null;
  entry_zone_min: number | null;
  entry_zone_max: number | null;
  stop_loss: number | null;
  sl_points: number | null;
  tp1: number | null; tp1_points: number | null;
  tp2: number | null; tp2_points: number | null;
  tp3: number | null; tp3_points: number | null;
  risk_reward: string | null;
  higher_tf_bias: string | null;
  setup_status: string | null;
  setup_status_note: string | null;
  is_counter_trend: boolean;
  reasoning: string[] | null;
  entry_validation: {
    confirmation_signal?: string;
    entry_trigger?: string;
    invalidation_price?: number;
    invalidation_signal?: string;
    candles_to_wait?: number;
    key_warning?: string;
  } | null;
  newbie: any | null;
  outcome: 'PENDING' | 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT' | 'STOPPED_OUT' | 'SKIPPED';
  outcome_notes: string | null;
  outcome_updated_at: string | null;
  created_at: string;
};

export type JournalEntry = {
  id: string;
  user_id: string;
  analysis_id: string | null;
  symbol: string;
  timeframe: string | null;
  direction: string | null;
  pre_trade_plan: string | null;
  emotional_state: 'CONFIDENT' | 'FEARFUL' | 'GREEDY' | 'NEUTRAL' | 'FOMO' | 'DISCIPLINED';
  followed_plan: boolean | null;
  entry_notes: string | null;
  outcome: 'PENDING' | 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT' | 'STOPPED_OUT' | 'SKIPPED' | 'MISSED';
  pnl_points: number | null;
  pnl_dollars: number | null;
  post_trade_notes: string | null;
  lessons_learned: string | null;
  ai_feedback: string | null;
  ai_feedback_at: string | null;
  trade_date: string;
  created_at: string;
  updated_at: string;
};
