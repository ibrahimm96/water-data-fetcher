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