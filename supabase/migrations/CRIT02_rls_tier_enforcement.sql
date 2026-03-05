-- ============================================================
-- CRIT-02 FIX: Tier-Based RLS for futures_signals
-- ============================================================
-- PROBLEM: Any authenticated user (free OR elite) could bypass
-- the entire paywall by calling the REST API directly:
--   GET /rest/v1/futures_signals
--   Authorization: Bearer <any-valid-JWT>
-- The blur overlay in the app was purely cosmetic CSS.
--
-- SOLUTION:
-- 1. Drop the permissive "authenticated read" policy
-- 2. Add a policy that allows elite users to read all signals
-- 3. Create a Postgres function get_free_tier_signals() that
--    returns all ACTIVE signals but NULLS OUT sensitive trade
--    data (entry zone, TPs, SL) for all except the 1 best signal
--    → Free users see signal cards (name, direction, confidence)
--      but cannot see actual trade levels without upgrading.
-- 4. Update HotPicksTab to call this function for free users.
--    (Frontend changes are in src/pages/HotPicksTab.tsx)
-- ============================================================

-- Step 1: Drop old permissive policy
DROP POLICY IF EXISTS "authenticated read" ON futures_signals;

-- Step 2: Elite-only direct table access
CREATE POLICY "elite_read_signals" ON futures_signals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.subscription_tier = 'elite'
    )
  );

-- Step 3: Free tier function — returns signal metadata for all,
-- but nulls out trade data for locked signals (all except best 1)
CREATE OR REPLACE FUNCTION get_free_tier_signals()
RETURNS TABLE (
  id             uuid,
  symbol         text,
  exchange       text,
  full_name      text,
  timeframe      text,
  direction      text,
  confidence     integer,
  entry_zone_min numeric,
  entry_zone_max numeric,
  tp1            numeric,
  tp1_points     numeric,
  tp2            numeric,
  tp2_points     numeric,
  tp3            numeric,
  tp3_points     numeric,
  stop_loss      numeric,
  sl_points      numeric,
  risk_reward    text,
  reasoning      jsonb,
  status         text,
  setup_status   text,
  setup_status_note text,
  higher_tf_bias text,
  entry_validation jsonb,
  current_price  numeric,
  session        text,
  generated_at   timestamptz,
  expires_at     timestamptz,
  created_at     timestamptz,
  is_counter_trend boolean,
  newbie         jsonb,
  is_locked      boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_best_id uuid;
BEGIN
  -- Pick the single highest-confidence active signal for the free user
  SELECT fs.id INTO v_best_id
  FROM futures_signals fs
  WHERE fs.status = 'ACTIVE'
  ORDER BY fs.confidence DESC, fs.generated_at DESC
  LIMIT 1;

  -- Return all active signals:
  -- · Unlocked signal: full trade data visible
  -- · Locked signals: entry/tp/sl/reasoning are NULL — visible in UI as "locked"
  RETURN QUERY
  SELECT
    fs.id,
    fs.symbol,
    fs.exchange,
    fs.full_name,
    fs.timeframe,
    fs.direction,
    fs.confidence,
    CASE WHEN fs.id = v_best_id THEN fs.entry_zone_min ELSE NULL END AS entry_zone_min,
    CASE WHEN fs.id = v_best_id THEN fs.entry_zone_max ELSE NULL END AS entry_zone_max,
    CASE WHEN fs.id = v_best_id THEN fs.tp1 ELSE NULL END AS tp1,
    CASE WHEN fs.id = v_best_id THEN fs.tp1_points ELSE NULL END AS tp1_points,
    CASE WHEN fs.id = v_best_id THEN fs.tp2 ELSE NULL END AS tp2,
    CASE WHEN fs.id = v_best_id THEN fs.tp2_points ELSE NULL END AS tp2_points,
    CASE WHEN fs.id = v_best_id THEN fs.tp3 ELSE NULL END AS tp3,
    CASE WHEN fs.id = v_best_id THEN fs.tp3_points ELSE NULL END AS tp3_points,
    CASE WHEN fs.id = v_best_id THEN fs.stop_loss ELSE NULL END AS stop_loss,
    CASE WHEN fs.id = v_best_id THEN fs.sl_points ELSE NULL END AS sl_points,
    CASE WHEN fs.id = v_best_id THEN fs.risk_reward ELSE NULL END AS risk_reward,
    CASE WHEN fs.id = v_best_id THEN fs.reasoning ELSE NULL END AS reasoning,
    fs.status,
    fs.setup_status,
    fs.setup_status_note,
    CASE WHEN fs.id = v_best_id THEN fs.higher_tf_bias ELSE NULL END AS higher_tf_bias,
    CASE WHEN fs.id = v_best_id THEN fs.entry_validation ELSE NULL END AS entry_validation,
    fs.current_price,
    fs.session,
    fs.generated_at,
    fs.expires_at,
    fs.created_at,
    fs.is_counter_trend,
    CASE WHEN fs.id = v_best_id THEN fs.newbie ELSE NULL END AS newbie,
    (fs.id IS DISTINCT FROM v_best_id) AS is_locked
  FROM futures_signals fs
  WHERE fs.status = 'ACTIVE'
  ORDER BY fs.confidence DESC, fs.generated_at DESC;
END;
$$;

-- Grant to authenticated users
GRANT EXECUTE ON FUNCTION get_free_tier_signals() TO authenticated;

-- Also grant usage on the futures_signals columns needed for the function result
-- (SECURITY DEFINER means the function runs as the owner, bypassing RLS for its internal query)

COMMENT ON FUNCTION get_free_tier_signals() IS 
  'Returns all active signals for free-tier users. Trade data (entry zones, TPs, SL) 
   is nulled out for all signals except the single highest-confidence pick. 
   The is_locked column indicates whether a signal is the free pick or locked.
   Elite users should query the futures_signals table directly (RLS allows it).';
