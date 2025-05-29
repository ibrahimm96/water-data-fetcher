-- First, remove any existing duplicates by keeping only one record for each unique combination
WITH duplicates AS (
  SELECT 
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY monitoring_location_id, measurement_datetime, variable_code 
      ORDER BY ctid
    ) as rn
  FROM groundwater_time_series
  WHERE monitoring_location_id IS NOT NULL 
    AND measurement_datetime IS NOT NULL 
    AND variable_code IS NOT NULL
)
DELETE FROM groundwater_time_series 
WHERE ctid IN (
  SELECT ctid FROM duplicates WHERE rn > 1
);

-- Add unique constraint to prevent duplicate time series data
ALTER TABLE groundwater_time_series 
ADD CONSTRAINT unique_measurement 
UNIQUE (monitoring_location_id, measurement_datetime, variable_code);

-- Add indexes for performance on frequently queried fields
CREATE INDEX IF NOT EXISTS idx_time_series_datetime 
ON groundwater_time_series (measurement_datetime);

CREATE INDEX IF NOT EXISTS idx_time_series_location 
ON groundwater_time_series (monitoring_location_id);

CREATE INDEX IF NOT EXISTS idx_time_series_location_datetime 
ON groundwater_time_series (monitoring_location_id, measurement_datetime);

-- Add index on sites table for faster lookups
CREATE INDEX IF NOT EXISTS idx_sites_location_id 
ON groundwater_monitoring_sites (monitoring_location_id);