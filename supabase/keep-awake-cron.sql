-- =========================================================
-- SUPABASE NATIVE KEEP-AWAKE (pg_cron)
-- =========================================================
-- IMPORTANT:
-- 1. Click "Run" (or press Cmd+Enter / Ctrl+Enter) to execute.
-- 2. Do NOT click "Query Plan" or "Explain", as they only support
--    analyzing a single SQL statement at a time.
-- =========================================================

-- 1. Enable the pg_cron extension (if not already enabled)
create extension if not exists pg_cron;

-- 2. Schedule a keep-awake heartbeat query
-- This runs at 9:00 AM UTC every 3 days (interval is safely within the 7-day pause limit).
-- It queries a table to register activity.
select cron.schedule(
  'keep-database-active-heartbeat',
  '0 9 */3 * *',
  $$ select count(*) from physical_meters; $$
);

-- =========================================================
-- MONITORING & UTILITIES
-- =========================================================

-- View all active scheduled jobs:
-- select * from cron.job;

-- View execution logs/details to verify it is running:
-- select * from cron.job_run_details order by start_time desc limit 10;

-- Unschedule/delete the job if needed:
-- select cron.unschedule('keep-database-active-heartbeat');
