-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Setup daily groundwater update cron job
SELECT cron.schedule(
  'daily-groundwater-update',           -- job name
  '0 2 * * *',                         -- cron expression (daily at 2 AM UTC)
  $$                                   -- SQL to execute
    SELECT
      net.http_post(
        url := 'https://deyeevuxcfosbbcyagko.supabase.co/functions/v1/daily-groundwater-update',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
        body := '{}'
      ) as request_id;
  $$
);

-- Add helpful comments
COMMENT ON EXTENSION pg_cron IS 'PostgreSQL cron extension for scheduling jobs';

-- To view scheduled jobs, run: SELECT * FROM cron.job;
-- To unschedule the job, run: SELECT cron.unschedule('daily-groundwater-update');