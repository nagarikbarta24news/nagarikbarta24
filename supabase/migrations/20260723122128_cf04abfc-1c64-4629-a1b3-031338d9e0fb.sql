
-- Reschedule to fit ~150 credits/month budget:
-- 1) Drop morning ingest; keep single evening run (8 PM BDT = 14:00 UTC)
-- 2) Move sitemap ping from hourly to once daily (03:15 UTC)
SELECT cron.unschedule('news-ingest-morning-bdt');

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'gsc-sitemap-autosubmit'),
  schedule := '15 3 * * *'
);
