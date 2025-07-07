-- Create materialized view for groundwater sites with historical data including statistical columns
-- This view includes min_value, max_value, and avg_value for frontend filtering

-- First drop the view if it exists
DROP MATERIALIZED VIEW IF EXISTS gw_sites_with_historical_data;

-- Create the materialized view with all required columns
CREATE MATERIALIZED VIEW gw_sites_with_historical_data AS
WITH site_statistics AS (
  SELECT 
    gts.monitoring_location_id,
    -- Site metadata (using MODE for most common values)
    MODE() WITHIN GROUP (ORDER BY gts.site_name) as monitoring_location_name,
    MODE() WITHIN GROUP (ORDER BY gts.agency_code) as agency_code,
    MODE() WITHIN GROUP (ORDER BY gts.state_code) as state_code,
    MODE() WITHIN GROUP (ORDER BY gts.county_code) as county_code,
    MODE() WITHIN GROUP (ORDER BY gts.latitude) as latitude,
    MODE() WITHIN GROUP (ORDER BY gts.longitude) as longitude,
    MODE() WITHIN GROUP (ORDER BY gts.huc_code) as hydrologic_unit_code,
    MODE() WITHIN GROUP (ORDER BY gts.unit) as unit,
    MODE() WITHIN GROUP (ORDER BY gts.variable_name) as variable_name,
    MODE() WITHIN GROUP (ORDER BY gts.variable_code) as variable_code,
    
    -- Measurement statistics
    COUNT(*) as measurement_count,
    MIN(gts.measurement_value) as min_value,
    MAX(gts.measurement_value) as max_value,
    AVG(gts.measurement_value) as avg_value,
    
    -- Date range
    ARRAY[
      EXTRACT(YEAR FROM MIN(gts.measurement_datetime))::text,
      EXTRACT(YEAR FROM MAX(gts.measurement_datetime))::text
    ] as date_range,
    
    MIN(gts.measurement_datetime) as earliest_measurement,
    MAX(gts.measurement_datetime) as latest_measurement
    
  FROM groundwater_time_series gts
  WHERE gts.monitoring_location_id IS NOT NULL
    AND gts.latitude IS NOT NULL 
    AND gts.longitude IS NOT NULL
    AND gts.measurement_datetime IS NOT NULL
    AND gts.measurement_value IS NOT NULL
  GROUP BY gts.monitoring_location_id
  HAVING COUNT(*) > 0
),
site_metadata AS (
  SELECT DISTINCT ON (gms.monitoring_location_id)
    gms.monitoring_location_id,
    gms.monitoring_location_number,
    gms.site_type_code,
    gms.aquifer_code,
    gms.aquifer_type_code,
    gms.altitude,
    gms.vertical_datum
  FROM groundwater_monitoring_sites gms
  WHERE gms.monitoring_location_id IS NOT NULL
)
SELECT 
  -- Use groundwater_monitoring_sites as the base for consistent structure
  COALESCE(sm.monitoring_location_id, ss.monitoring_location_id) as monitoring_location_id,
  COALESCE(sm.monitoring_location_number, ss.monitoring_location_id) as monitoring_location_number,
  ss.monitoring_location_name,
  ss.agency_code,
  ss.state_code,
  ss.county_code,
  sm.site_type_code,
  ss.hydrologic_unit_code,
  sm.aquifer_code,
  sm.aquifer_type_code,
  sm.altitude,
  sm.vertical_datum,
  
  -- Create PostGIS geometry from coordinates
  ST_SetSRID(ST_MakePoint(ss.longitude, ss.latitude), 4326) as geometry,
  
  -- Measurement statistics
  ss.measurement_count,
  ss.min_value,
  ss.max_value,
  ss.avg_value,
  
  -- Date information
  ss.date_range,
  ss.earliest_measurement,
  ss.latest_measurement,
  
  -- Additional metadata
  ss.unit,
  ss.variable_name,
  ss.variable_code
  
FROM site_statistics ss
LEFT JOIN site_metadata sm ON ss.monitoring_location_id = sm.monitoring_location_id
WHERE ss.measurement_count > 0
ORDER BY ss.monitoring_location_id;

-- Create indexes for better performance
CREATE INDEX idx_gw_sites_historical_location_id ON gw_sites_with_historical_data(monitoring_location_id);
CREATE INDEX idx_gw_sites_historical_measurement_count ON gw_sites_with_historical_data(measurement_count);
CREATE INDEX idx_gw_sites_historical_min_value ON gw_sites_with_historical_data(min_value);
CREATE INDEX idx_gw_sites_historical_max_value ON gw_sites_with_historical_data(max_value);
CREATE INDEX idx_gw_sites_historical_avg_value ON gw_sites_with_historical_data(avg_value);
CREATE INDEX idx_gw_sites_historical_geometry ON gw_sites_with_historical_data USING GIST(geometry);

-- Add helpful comments
COMMENT ON MATERIALIZED VIEW gw_sites_with_historical_data IS 'Materialized view of groundwater monitoring sites with aggregated measurement statistics including min, max, and average values';
COMMENT ON COLUMN gw_sites_with_historical_data.min_value IS 'Minimum measurement value for the site (feet below ground surface)';
COMMENT ON COLUMN gw_sites_with_historical_data.max_value IS 'Maximum measurement value for the site (feet below ground surface)';
COMMENT ON COLUMN gw_sites_with_historical_data.avg_value IS 'Average measurement value for the site (feet below ground surface)';
COMMENT ON COLUMN gw_sites_with_historical_data.measurement_count IS 'Total number of measurements for the site';
COMMENT ON COLUMN gw_sites_with_historical_data.date_range IS 'Array containing start and end years of measurements';

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_gw_sites_with_historical_data()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW gw_sites_with_historical_data;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_gw_sites_with_historical_data() IS 'Refreshes the gw_sites_with_historical_data materialized view with latest data';