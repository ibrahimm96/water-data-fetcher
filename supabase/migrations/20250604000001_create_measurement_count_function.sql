-- Create function to update measurement counts for groundwater sites
-- This function calculates measurement statistics from the time series table

CREATE OR REPLACE FUNCTION update_site_measurement_counts()
RETURNS void AS $$
BEGIN
    -- Update measurement counts and date ranges for sites
    UPDATE groundwater_sites_by_county 
    SET 
        total_measurements = COALESCE(stats.measurement_count, 0),
        earliest_measurement = stats.earliest_measurement,
        latest_measurement = stats.latest_measurement,
        last_updated = now()
    FROM (
        SELECT 
            gts.monitoring_location_id,
            COUNT(*) as measurement_count,
            MIN(gts.measurement_datetime) as earliest_measurement,
            MAX(gts.measurement_datetime) as latest_measurement
        FROM groundwater_time_series gts
        GROUP BY gts.monitoring_location_id
    ) stats
    WHERE groundwater_sites_by_county.monitoring_location_id = stats.monitoring_location_id;
    
    -- Log the update
    RAISE NOTICE 'Updated measurement counts for % sites', 
        (SELECT COUNT(*) FROM groundwater_sites_by_county WHERE last_updated = now());
END;
$$ LANGUAGE plpgsql;

-- Create function to get site statistics by county
CREATE OR REPLACE FUNCTION get_county_groundwater_stats(county_code_param text DEFAULT NULL)
RETURNS TABLE (
    county_code text,
    county_name text,
    total_sites bigint,
    sites_with_data bigint,
    total_measurements bigint,
    avg_measurements_per_site numeric,
    earliest_record timestamptz,
    latest_record timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gsc.county_code,
        gsc.county_name,
        COUNT(*)::bigint as total_sites,
        COUNT(CASE WHEN gsc.total_measurements > 0 THEN 1 END)::bigint as sites_with_data,
        SUM(gsc.total_measurements)::bigint as total_measurements,
        ROUND(AVG(gsc.total_measurements), 2) as avg_measurements_per_site,
        MIN(gsc.earliest_measurement) as earliest_record,
        MAX(gsc.latest_measurement) as latest_record
    FROM groundwater_sites_by_county gsc
    WHERE (county_code_param IS NULL OR gsc.county_code = county_code_param)
    GROUP BY gsc.county_code, gsc.county_name
    ORDER BY gsc.county_name;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON FUNCTION update_site_measurement_counts() IS 'Updates cached measurement counts and date ranges for all groundwater sites';
COMMENT ON FUNCTION get_county_groundwater_stats(text) IS 'Returns summary statistics for groundwater sites by county';