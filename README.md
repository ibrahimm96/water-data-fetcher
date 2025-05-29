# California Groundwater Monitoring System

A Node.js application that fetches groundwater monitoring data from USGS APIs and stores it in a Supabase database for analysis and visualization. The system provides comprehensive coverage of California's 58 counties with automated daily updates.

## Features

- **Statewide Coverage**: Fetches data from all 58 California counties
- **Priority County Focus**: Configurable to process high-priority agricultural and urban counties
- **Automated Updates**: Daily cron job for continuous data collection
- **Historical Backfill**: Scripts to populate historical data ranges
- **Spatial Data**: PostGIS integration for geographic analysis
- **County Lookup**: Built-in California counties reference table

## Data Sources

- **USGS Water Services API**: Real-time and historical groundwater level data
- **USGS OGC API**: Site metadata and monitoring location details
- **Coverage**: Active groundwater monitoring sites across California

## Database Schema

### Main Tables
- `groundwater_monitoring_sites`: Site metadata and locations
- `groundwater_time_series`: Historical measurement data with PostGIS geometry
- `california_counties`: County lookup table with FIPS codes
- `job_logs`: System monitoring and execution tracking

### Key Features
- Unique constraints prevent duplicate measurements
- PostGIS POINT geometry with SRID 4326 for spatial queries
- Optimized indexes for performance on common queries

## Setup

### Prerequisites
- Node.js (ES modules support)
- Supabase account and project
- Environment variables configured

### Environment Configuration
Create a `.env` file:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Database Setup
```bash
# Apply database migrations
npx supabase db push

# Deploy Edge Functions
npx supabase functions deploy daily-groundwater-update
```

## Usage

### Scripts

#### Historical Backfill
```bash
# Process priority counties (default)
/opt/anaconda3/bin/node fetch_gw_historical_backfill.js

# Edit script to process all counties
# Set USE_PRIORITY_COUNTIES_ONLY = false
```

#### Daily Updates
```bash
# Manual daily update
/opt/anaconda3/bin/node fetch_gw_daily.js

# Automated via cron (deployed)
# Runs daily at 2 AM UTC via Supabase Edge Function
```

#### Site Data
```bash
# Fetch and update monitoring site metadata
/opt/anaconda3/bin/node fetch_gw_sites.js
```

### Configuration Options

#### Priority Counties (18 counties)
High-impact agricultural and urban areas:
- Fresno, Kern, Kings, Los Angeles, Madera, Merced
- Monterey, Orange, Riverside, Sacramento, San Bernardino
- San Diego, San Joaquin, Santa Clara, Stanislaus, Tulare, Ventura, Yolo

#### Processing Parameters
- `COUNTY_BATCH_SIZE`: Counties processed simultaneously (default: 3-5)
- `LOOKBACK_DAYS`: Days to overlap for daily updates (default: 7)
- `CHUNK_MONTHS`: Historical processing periods (default: 12)

## Data Analysis

### Example Queries

```sql
-- Get measurements by county
SELECT 
  cc.county_name,
  COUNT(*) as measurement_count,
  AVG(gts.measurement_value) as avg_groundwater_level
FROM groundwater_time_series gts
JOIN california_counties cc ON gts.county_code = cc.fips_code
GROUP BY cc.county_name
ORDER BY measurement_count DESC;

-- Recent measurements for priority counties
SELECT 
  gts.monitoring_location_id,
  cc.county_name,
  gts.measurement_datetime,
  gts.measurement_value,
  gts.unit
FROM groundwater_time_series gts
JOIN california_counties cc ON gts.county_code = cc.fips_code
WHERE cc.is_priority = true
  AND gts.measurement_datetime >= NOW() - INTERVAL '30 days'
ORDER BY gts.measurement_datetime DESC;

-- Spatial queries using PostGIS
SELECT 
  monitoring_location_id,
  site_name,
  ST_AsText(geometry) as location
FROM groundwater_time_series 
WHERE ST_DWithin(
  geometry, 
  ST_GeomFromText('POINT(-120.5 37.0)', 4326), 
  0.1  -- ~11km radius
);
```

### Monitoring System Performance

```sql
-- View job execution logs
SELECT * FROM job_logs 
ORDER BY completed_at DESC 
LIMIT 10;

-- Check cron job status
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 5;
```

## Architecture

### File Structure
```
├── fetch_gw_historical_backfill.js  # Historical data collection
├── fetch_gw_daily.js               # Daily incremental updates
├── fetch_gw_sites.js               # Site metadata collection
├── utils.js                        # Shared utilities and API functions
├── california_counties.js          # County definitions and FIPS codes
├── supabase.js                     # Database client configuration
├── supabase/
│   ├── functions/
│   │   └── daily-groundwater-update/ # Edge Function for automation
│   └── migrations/                  # Database schema and setup
└── .env                            # Environment configuration
```

### Data Flow
1. **Site Discovery**: `fetch_gw_sites.js` discovers and updates monitoring locations
2. **Historical Backfill**: `fetch_gw_historical_backfill.js` populates historical ranges
3. **Daily Updates**: Automated Edge Function fetches recent data with overlap detection
4. **Data Storage**: Upsert operations prevent duplicates while updating latest measurements

## Deployment

### Supabase Edge Functions
The system uses Supabase Edge Functions for serverless execution:

```bash
# Deploy the daily update function
npx supabase functions deploy daily-groundwater-update

# View deployment status
npx supabase functions list
```

### Cron Scheduling
Automated daily execution at 2 AM UTC:

```sql
-- View current schedule
SELECT * FROM cron.job;

-- Modify schedule (example: every 6 hours)
SELECT cron.unschedule('daily-groundwater-update');
SELECT cron.schedule('daily-groundwater-update', '0 */6 * * *', $$..$$);
```

## Performance

### Optimization Features
- County-based batching to respect API rate limits
- Chunked database operations for memory efficiency
- Retry logic with exponential backoff
- Duplicate detection and upsert operations
- Optimized database indexes for common query patterns

### Typical Performance
- **Historical Backfill**: ~12,800 records from 18 counties in <1 minute
- **Daily Updates**: Processes 18 counties in ~30-60 seconds
- **API Respect**: 1-2 second delays between county requests

## Monitoring

The system includes comprehensive logging:
- Execution results stored in `job_logs` table
- County-level processing statistics
- Error tracking and retry attempts
- Performance metrics (duration, record counts)

## Contributing

### Development Setup
1. Clone repository
2. Configure `.env` with Supabase credentials
3. Run `npx supabase db push` to setup database
4. Test with priority counties before full deployment

### Code Conventions
- ES modules with async/await patterns
- Error handling with retry logic
- Batch processing for API and database operations
- PostGIS geometry format: `SRID=4326;POINT(lon lat)`

## License

This project is focused on water resource monitoring and environmental data collection for California groundwater management.