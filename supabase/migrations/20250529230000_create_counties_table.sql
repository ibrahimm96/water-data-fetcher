-- Create California counties lookup table
CREATE TABLE california_counties (
  fips_code TEXT PRIMARY KEY,
  county_name TEXT NOT NULL,
  state_code TEXT DEFAULT 'CA',
  is_priority BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert all 58 California counties with FIPS codes
INSERT INTO california_counties (fips_code, county_name, is_priority) VALUES
  ('06001', 'Alameda', false),
  ('06003', 'Alpine', false),
  ('06005', 'Amador', false),
  ('06007', 'Butte', false),
  ('06009', 'Calaveras', false),
  ('06011', 'Colusa', false),
  ('06013', 'Contra Costa', false),
  ('06015', 'Del Norte', false),
  ('06017', 'El Dorado', false),
  ('06019', 'Fresno', true),
  ('06021', 'Glenn', false),
  ('06023', 'Humboldt', false),
  ('06025', 'Imperial', false),
  ('06027', 'Inyo', false),
  ('06029', 'Kern', true),
  ('06031', 'Kings', true),
  ('06033', 'Lake', false),
  ('06035', 'Lassen', false),
  ('06037', 'Los Angeles', true),
  ('06039', 'Madera', true),
  ('06041', 'Marin', false),
  ('06043', 'Mariposa', false),
  ('06045', 'Mendocino', false),
  ('06047', 'Merced', true),
  ('06049', 'Modoc', false),
  ('06051', 'Mono', false),
  ('06053', 'Monterey', true),
  ('06055', 'Napa', false),
  ('06057', 'Nevada', false),
  ('06059', 'Orange', true),
  ('06061', 'Placer', false),
  ('06063', 'Plumas', false),
  ('06065', 'Riverside', true),
  ('06067', 'Sacramento', true),
  ('06069', 'San Benito', false),
  ('06071', 'San Bernardino', true),
  ('06073', 'San Diego', true),
  ('06075', 'San Francisco', false),
  ('06077', 'San Joaquin', true),
  ('06079', 'San Luis Obispo', false),
  ('06081', 'San Mateo', false),
  ('06083', 'Santa Barbara', false),
  ('06085', 'Santa Clara', true),
  ('06087', 'Santa Cruz', false),
  ('06089', 'Shasta', false),
  ('06091', 'Sierra', false),
  ('06093', 'Siskiyou', false),
  ('06095', 'Solano', false),
  ('06097', 'Sonoma', false),
  ('06099', 'Stanislaus', true),
  ('06101', 'Sutter', false),
  ('06103', 'Tehama', false),
  ('06105', 'Trinity', false),
  ('06107', 'Tulare', true),
  ('06109', 'Tuolumne', false),
  ('06111', 'Ventura', true),
  ('06113', 'Yolo', true),
  ('06115', 'Yuba', false);

-- Add indexes for fast lookups
CREATE INDEX idx_counties_name ON california_counties (county_name);
CREATE INDEX idx_counties_priority ON california_counties (is_priority);

-- Add helpful comments
COMMENT ON TABLE california_counties IS 'Lookup table for California counties with FIPS codes and priority classification';
COMMENT ON COLUMN california_counties.fips_code IS 'Federal Information Processing Standard county code (5 digits)';
COMMENT ON COLUMN california_counties.is_priority IS 'Whether this county is classified as high-priority for groundwater monitoring';