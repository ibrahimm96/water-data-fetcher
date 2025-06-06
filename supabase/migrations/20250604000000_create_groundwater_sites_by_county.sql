-- Create groundwater sites by county table for efficient county-based queries
-- This table combines site metadata with county information and measurement summaries

CREATE TABLE groundwater_sites_by_county (
    id bigserial PRIMARY KEY,
    monitoring_location_id text NOT NULL,
    site_name text,
    agency_code text DEFAULT 'USGS',
    site_type_code text DEFAULT 'GW',
    
    -- Location information
    county_code text NOT NULL,
    county_name text,
    state_code text DEFAULT '06', -- California
    huc_code text,
    location geometry(POINT, 4326), -- PostGIS point for spatial queries
    latitude double precision,
    longitude double precision,
    altitude double precision,
    altitude_datum text,
    
    -- Site characteristics
    aquifer_code text,
    aquifer_name text,
    well_depth_ft double precision,
    
    -- Data availability summary (updated periodically)
    earliest_measurement timestamptz,
    latest_measurement timestamptz,
    total_measurements integer DEFAULT 0,
    last_updated timestamptz DEFAULT now(),
    
    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    UNIQUE(monitoring_location_id, county_code)
);

-- Create indexes for efficient queries
CREATE INDEX idx_gw_sites_county_code ON groundwater_sites_by_county(county_code);
CREATE INDEX idx_gw_sites_state_code ON groundwater_sites_by_county(state_code);
CREATE INDEX idx_gw_sites_location ON groundwater_sites_by_county USING GIST(location);
CREATE INDEX idx_gw_sites_monitoring_id ON groundwater_sites_by_county(monitoring_location_id);
CREATE INDEX idx_gw_sites_last_updated ON groundwater_sites_by_county(last_updated);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_groundwater_sites_by_county_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_groundwater_sites_by_county_updated_at
    BEFORE UPDATE ON groundwater_sites_by_county
    FOR EACH ROW
    EXECUTE FUNCTION update_groundwater_sites_by_county_updated_at();

-- Add RLS (Row Level Security) if needed
-- ALTER TABLE groundwater_sites_by_county ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON TABLE groundwater_sites_by_county IS 'Groundwater monitoring sites organized by county for efficient county-based queries and analysis';
COMMENT ON COLUMN groundwater_sites_by_county.monitoring_location_id IS 'USGS site identifier (e.g., 06030500)';
COMMENT ON COLUMN groundwater_sites_by_county.county_code IS 'FIPS county code (e.g., 06047 for Merced County)';
COMMENT ON COLUMN groundwater_sites_by_county.location IS 'PostGIS point geometry for spatial queries (SRID 4326)';
COMMENT ON COLUMN groundwater_sites_by_county.total_measurements IS 'Cached count of measurements for this site - updated periodically';