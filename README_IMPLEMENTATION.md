# California Statewide Groundwater Data Fetching Implementation

This implementation provides both historical backfill and daily incremental updates for groundwater monitoring data from USGS APIs **across all 58 California counties**.

## New Files Created

### Scripts
- `california_counties.js` - Complete list of California counties with FIPS codes
- `utils.js` - Shared utility functions for date handling, API calls, and multi-county processing
- `fetch_gw_historical_backfill.js` - Statewide historical data backfill with county batching
- `fetch_gw_daily.js` - Statewide daily incremental updates with county processing
- `fetch_gw_sites.js` - Statewide monitoring sites fetching for all counties
- `fetch_gw_historical.js` - Updated to use upsert operations instead of insert

### Database
- `migrations/add_constraints.sql` - Database constraints and indexes for duplicate prevention

### Supabase Edge Function
- `supabase/functions/daily-groundwater-update/index.ts` - Serverless function for statewide daily updates
- `supabase/functions/daily-groundwater-update/cron.sql` - Cron job configuration

## Key Features

### 1. Duplicate Prevention
- Unique constraint on `(monitoring_location_id, measurement_datetime, variable_code)`
- All scripts use upsert operations to handle conflicts gracefully
- Allows data corrections and late-arriving measurements

### 2. California Statewide Coverage
- **All 58 California counties** supported with complete FIPS code mapping
- **Priority counties** option for faster processing of high-importance areas
- **County batching** to manage API load and processing efficiency
- **Individual county tracking** with detailed progress reporting

### 3. Historical Backfill
- Processes **all counties** with configurable date chunks (default: 1 year)
- **County-by-county processing** with fault tolerance
- Handles API rate limits with retry logic and delays
- Resumes from where it left off if interrupted
- Processes in batches to avoid memory issues

### 4. Daily Incremental Updates
- **Statewide daily processing** across all or priority counties
- Automatically determines start date based on latest data per county
- Uses 7-day lookback period to catch late-arriving data
- Idempotent operations (safe to run multiple times)
- Comprehensive error handling and logging

### 5. Monitoring & Logging
- Logs all job executions to `job_logs` table
- Records success/failure status and processing metrics
- Error messages for troubleshooting
- Performance metrics (duration, record counts)

## Usage Instructions

### Setup Database Constraints
First, apply the database constraints (you'll need to do this manually):
```sql
-- Apply the constraints from migrations/add_constraints.sql
```

### Running Scripts Locally

**Historical Backfill:**
```bash
/opt/anaconda3/bin/node fetch_gw_historical_backfill.js
```

**Daily Update:**
```bash
/opt/anaconda3/bin/node fetch_gw_daily.js
```

**Original Script (now with upserts):**
```bash
/opt/anaconda3/bin/node fetch_gw_historical.js
```

**Site Data:**
```bash
/opt/anaconda3/bin/node fetch_gw_sites.js
```

### Deploy Supabase Edge Function

1. Deploy the function:
```bash
supabase functions deploy daily-groundwater-update
```

2. Set up environment variables in Supabase dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. Set up cron job (manual step in Supabase SQL editor):
```sql
-- Update the URL to your actual project reference
-- Then run the SQL from cron.sql
```

### Configuration Options

**Date Ranges (Historical Backfill):**
- `START_DATE`: Beginning of historical data range
- `END_DATE`: End of historical data range (defaults to today)
- `CHUNK_MONTHS`: Size of date chunks to process (default: 12 months)

**Daily Updates:**
- `LOOKBACK_DAYS`: How many days to overlap (default: 7 days)
- `COUNTY_CODE`: Target county code (default: '06047' for Merced)

**Batch Processing:**
- `batchSize`: Number of records to process at once (default: 500-1000)

## Data Flow

1. **Sites**: `fetch_gw_sites.js` populates monitoring site metadata
2. **Historical**: `fetch_gw_historical_backfill.js` backfills historical time series data
3. **Daily**: Edge function automatically runs daily to fetch new data
4. **Monitoring**: All operations logged to `job_logs` table

## Error Handling

- **API Failures**: Exponential backoff with configurable retry limits
- **Database Errors**: Detailed error logging with context
- **Data Quality**: Validation and filtering of invalid measurements
- **Network Issues**: Graceful degradation and continuation

## Monitoring

Check the `job_logs` table for:
- Daily job execution status
- Processing metrics (records processed, duration)
- Error messages and stack traces
- Performance trends over time

## Security

- Uses service role key for database operations
- CORS headers properly configured for Edge Function
- Environment variables for sensitive configuration
- No hardcoded credentials in source code

## Performance Optimizations

- Batch processing for large datasets
- Database indexes on frequently queried fields
- Efficient upsert operations with conflict resolution
- Memory-conscious streaming for large API responses
- Configurable processing chunk sizes