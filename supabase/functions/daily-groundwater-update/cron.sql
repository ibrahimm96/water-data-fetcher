-- Enable pg_cron extension if not already enabled
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

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule the job:
-- SELECT cron.unschedule('daily-groundwater-update');