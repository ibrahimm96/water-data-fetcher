-- Create functions to efficiently aggregate site data with measurement counts
-- These functions help solve the performance issue in the frontend

-- Function to get distinct site count
CREATE OR REPLACE FUNCTION get_distinct_site_count()
RETURNS TABLE (
    total_sites bigint,
    sites_with_coordinates bigint,
    sites_with_measurements bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT gts.monitoring_location_id)::bigint as total_sites,
        COUNT(DISTINCT CASE 
            WHEN gts.latitude IS NOT NULL AND gts.longitude IS NOT NULL 
            THEN gts.monitoring_location_id 
        END)::bigint as sites_with_coordinates,
        COUNT(DISTINCT CASE 
            WHEN gts.measurement_datetime IS NOT NULL AND gts.measurement_value IS NOT NULL 
            THEN gts.monitoring_location_id 
        END)::bigint as sites_with_measurements
    FROM groundwater_time_series gts;
END;
$$ LANGUAGE plpgsql;

-- Function to get sites with measurement summary (optimized for frontend)
CREATE OR REPLACE FUNCTION get_sites_with_measurement_summary()
RETURNS TABLE (
    monitoring_location_id text,
    site_name text,
    county_code text,
    state_code text,
    latitude double precision,
    longitude double precision,
    measurement_count bigint,
    latest_measurement timestamptz,
    earliest_measurement timestamptz,
    latest_value double precision,
    unit text,
    variable_name text
) AS $$
BEGIN
    RETURN QUERY
    WITH site_aggregates AS (
        SELECT 
            gts.monitoring_location_id,
            -- Get the most common values for site metadata
            MODE() WITHIN GROUP (ORDER BY gts.site_name) as site_name,
            MODE() WITHIN GROUP (ORDER BY gts.county_code) as county_code,
            MODE() WITHIN GROUP (ORDER BY gts.state_code) as state_code,
            MODE() WITHIN GROUP (ORDER BY gts.latitude) as latitude,
            MODE() WITHIN GROUP (ORDER BY gts.longitude) as longitude,
            MODE() WITHIN GROUP (ORDER BY gts.unit) as unit,
            MODE() WITHIN GROUP (ORDER BY gts.variable_name) as variable_name,
            -- Aggregate measurement data
            COUNT(*) as measurement_count,
            MAX(gts.measurement_datetime) as latest_measurement,
            MIN(gts.measurement_datetime) as earliest_measurement,
            -- Get latest value (using DISTINCT ON for efficiency)
            (SELECT gts2.measurement_value 
             FROM groundwater_time_series gts2 
             WHERE gts2.monitoring_location_id = gts.monitoring_location_id 
               AND gts2.measurement_datetime IS NOT NULL 
               AND gts2.measurement_value IS NOT NULL
             ORDER BY gts2.measurement_datetime DESC 
             LIMIT 1) as latest_value
        FROM groundwater_time_series gts
        WHERE gts.monitoring_location_id IS NOT NULL
          AND gts.latitude IS NOT NULL 
          AND gts.longitude IS NOT NULL
          AND gts.measurement_datetime IS NOT NULL
          AND gts.measurement_value IS NOT NULL
        GROUP BY gts.monitoring_location_id
        HAVING COUNT(*) > 0  -- Only sites with measurements
    )
    SELECT 
        sa.monitoring_location_id,
        sa.site_name,
        sa.county_code,
        sa.state_code,
        sa.latitude,
        sa.longitude,
        sa.measurement_count,
        sa.latest_measurement,
        sa.earliest_measurement,
        sa.latest_value,
        sa.unit,
        sa.variable_name
    FROM site_aggregates sa
    ORDER BY sa.measurement_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Create index to improve performance of the aggregation queries
CREATE INDEX IF NOT EXISTS idx_groundwater_time_series_site_datetime 
ON groundwater_time_series(monitoring_location_id, measurement_datetime DESC)
WHERE measurement_datetime IS NOT NULL AND measurement_value IS NOT NULL;

-- Create index for location filtering
CREATE INDEX IF NOT EXISTS idx_groundwater_time_series_location_coords
ON groundwater_time_series(monitoring_location_id)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add helpful comments
COMMENT ON FUNCTION get_distinct_site_count() IS 'Returns counts of distinct sites in the groundwater_time_series table';
COMMENT ON FUNCTION get_sites_with_measurement_summary() IS 'Returns all sites with aggregated measurement data, optimized for map display';
COMMENT ON INDEX idx_groundwater_time_series_site_datetime IS 'Improves performance for site-specific time series queries';
COMMENT ON INDEX idx_groundwater_time_series_location_coords IS 'Improves performance for location-based site queries';