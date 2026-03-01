-- ═══════════════════════════════════════════════════════════════════════
-- NXXTFutures — Supabase Schema
-- Run this in your Supabase SQL editor
-- ═══════════════════════════════════════════════════════════════════════

-- ── Account settings (one row per user) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_settings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  account_balance NUMERIC(12,2) DEFAULT 10000 NOT NULL,
  risk_percent    NUMERIC(4,2)  DEFAULT 1.0   NOT NULL,
  htf_bias_lock   TEXT          DEFAULT 'OFF' CHECK (htf_bias_lock IN ('BULLISH','BEARISH','OFF')),
  updated_at      TIMESTAMPTZ   DEFAULT now()
);

ALTER TABLE account_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON account_settings USING (auth.uid() = user_id);

-- ── Futures signals (auto-populated by scanner cron) ─────────────────────────
CREATE TABLE IF NOT EXISTS futures_signals (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol             TEXT NOT NULL,
  exchange           TEXT NOT NULL,
  full_name          TEXT,
  timeframe          TEXT NOT NULL,
  direction          TEXT NOT NULL CHECK (direction IN ('BUY','SELL')),
  confidence         INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  entry_zone_min     NUMERIC NOT NULL,
  entry_zone_max     NUMERIC NOT NULL,
  tp1                NUMERIC NOT NULL,
  tp1_points         NUMERIC,
  tp2                NUMERIC NOT NULL,
  tp2_points         NUMERIC,
  tp3                NUMERIC NOT NULL,
  tp3_points         NUMERIC,
  stop_loss          NUMERIC NOT NULL,
  sl_points          NUMERIC,
  risk_reward        TEXT,
  reasoning          JSONB DEFAULT '[]',
  status             TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','TP1_HIT','TP2_HIT','TP3_HIT','STOPPED_OUT','EXPIRED')),
  setup_status       TEXT DEFAULT 'PENDING' CHECK (setup_status IN ('PENDING','AT_ENTRY','MISSED')),
  setup_status_note  TEXT,
  higher_tf_bias     TEXT,
  entry_validation   JSONB,
  current_price      NUMERIC,
  current_pnl_points NUMERIC DEFAULT 0,
  session            TEXT DEFAULT 'NY' CHECK (session IN ('ASIA','LONDON','NY','OFF')),
  atr_value          NUMERIC,
  news_warning       BOOLEAN DEFAULT FALSE,
  news_warning_note  TEXT,
  tick_size          NUMERIC,
  tick_value         NUMERIC,
  point_value        NUMERIC,
  contract_size      NUMERIC,
  generated_at       TIMESTAMPTZ DEFAULT now(),
  expires_at         TIMESTAMPTZ,
  status_updated_at  TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE futures_signals ENABLE ROW LEVEL SECURITY;
-- Only the service role can write signals; any authenticated user can read
CREATE POLICY "authenticated read" ON futures_signals FOR SELECT USING (auth.role() = 'authenticated');

-- Index for fast queries
CREATE INDEX idx_futures_signals_status ON futures_signals(status);
CREATE INDEX idx_futures_signals_generated_at ON futures_signals(generated_at DESC);
CREATE INDEX idx_futures_signals_symbol ON futures_signals(symbol);

-- ── Data analyses (chart upload results) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_analyses (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol           TEXT NOT NULL,
  timeframe        TEXT,
  direction        TEXT,
  confidence_score INTEGER,
  entry_price      NUMERIC,
  stop_loss        NUMERIC,
  take_profit_1    NUMERIC,
  take_profit_2    NUMERIC,
  take_profit_3    NUMERIC,
  risk_reward      TEXT,
  reasoning        JSONB,
  setup_status     TEXT,
  higher_tf_bias   TEXT,
  image_url        TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE data_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON data_analyses USING (auth.uid() = user_id);

-- Index for history queries
CREATE INDEX idx_data_analyses_user_created ON data_analyses(user_id, created_at DESC);

-- ── Storage bucket for chart images ──────────────────────────────────────────
-- Run this in Supabase Storage dashboard, or uncomment and run here:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('charts', 'charts', true);
-- CREATE POLICY "auth upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'charts' AND auth.role() = 'authenticated');
-- CREATE POLICY "public read"  ON storage.objects FOR SELECT USING (bucket_id = 'charts');
