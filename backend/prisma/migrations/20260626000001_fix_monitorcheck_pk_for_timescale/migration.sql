-- Drop dependent foreign keys
ALTER TABLE "Incident" DROP CONSTRAINT IF EXISTS "Incident_monitorId_fkey";

-- Drop the existing primary key
ALTER TABLE "MonitorCheck" DROP CONSTRAINT IF EXISTS "MonitorCheck_pkey" CASCADE;

-- Add a composite primary key that includes the time column
ALTER TABLE "MonitorCheck" ADD PRIMARY KEY ("id", "checkedAt");

-- Re-add the foreign key
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_monitorId_fkey" 
  FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Now create the hypertable
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
SELECT create_hypertable('"MonitorCheck"', 'checkedAt', if_not_exists => TRUE, migrate_data => TRUE);

-- Enable compression
ALTER TABLE "MonitorCheck" SET (timescaledb.compress = TRUE);
SELECT add_compression_policy('"MonitorCheck"', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_retention_policy('"MonitorCheck"', INTERVAL '1 year', if_not_exists => TRUE);