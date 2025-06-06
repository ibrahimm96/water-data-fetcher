# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack groundwater monitoring system with:
1. **Backend**: Node.js data fetching scripts that retrieve groundwater monitoring data from USGS APIs and store it in Supabase
2. **Frontend**: React/TypeScript web application with interactive Mapbox map visualization
3. **Database**: Supabase PostgreSQL with spatial data support

The project focuses on California groundwater data, displaying monitoring sites and their time series measurements.

## Core Architecture

- **Data Sources**: USGS Water Services API and USGS OGC API for groundwater monitoring locations and time series data
- **Database**: Supabase with main tables:
  - `groundwater_monitoring_sites`: Site metadata and locations
  - `groundwater_time_series`: Historical measurement data
  - `groundwater_sites_by_county`: **NEW** County-organized sites with siteType=GW filtering and measurement summaries
- **Configuration**: Environment variables for Supabase connection (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

## Key Scripts

- `fetch_gw_sites.js`: Fetches groundwater monitoring site metadata for California counties and upserts to Supabase
- `fetch_gw_historical.js`: Fetches time series groundwater level data for California counties and inserts to Supabase
- `fetch_gw_iv.js`: Fetches instantaneous value data for all ~70k sites (2007-present) with intelligent batching and rate limiting
- `fetch_gw_county_sites.js`: **NEW** County-based groundwater site fetcher with siteType=GW filtering and efficient county organization
- `test.js`: Legacy reference script (not actively used)
- `supabase.js`: Database client configuration

## Running Scripts

Use conda base environment as specified in global instructions:
```bash
# Fetch site metadata
/opt/anaconda3/bin/node fetch_gw_sites.js

# Fetch historical groundwater levels
/opt/anaconda3/bin/node fetch_gw_historical.js

# Fetch instantaneous values (large-scale operation)
/opt/anaconda3/bin/node fetch_gw_iv.js

# Resume instantaneous values from specific date
/opt/anaconda3/bin/node fetch_gw_iv.js 2015-01-01

# County-based groundwater site fetching (NEW)
/opt/anaconda3/bin/node fetch_gw_county_sites.js

# Fetch specific counties only
/opt/anaconda3/bin/node fetch_gw_county_sites.js 06047 06099 06019
```

## Environment Setup

Requires `.env` file with:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database operations

## Data Processing Notes

- Uses PostGIS POINT geometry format with SRID 4326 for spatial data
- Handles null values and validates data before database insertion
- Site data uses upsert operations to avoid duplicates
- Time series data allows multiple measurements per site/datetime

## County-Based Fetching Architecture (NEW)

The new `fetch_gw_county_sites.js` script implements an efficient county-based approach:

### Key Features
- **Filtered Data**: Only fetches sites with `siteType=GW` (groundwater monitoring wells)
- **County Organization**: Organizes data by California county codes for efficient regional analysis
- **Measurement Summaries**: Includes cached measurement counts and temporal ranges for performance
- **Spatial Indexing**: Uses PostGIS geometry for efficient spatial queries
- **Batch Processing**: Processes multiple counties in parallel with rate limiting

### Database Schema
The `groundwater_sites_by_county` table provides:
- Unique constraint on `(monitoring_location_id, county_code)` to prevent duplicates
- PostGIS spatial column for geographic queries
- Cached measurement statistics (count, earliest/latest dates)
- County name lookup integration with `california_counties.js`

### Usage Examples
```bash
# Fetch all California counties
/opt/anaconda3/bin/node fetch_gw_county_sites.js

# Fetch specific counties (Merced, Stanislaus, San Joaquin)
/opt/anaconda3/bin/node fetch_gw_county_sites.js 06047 06099 06019
```

### SQL Functions
- `update_site_measurement_counts()`: Updates cached measurement statistics
- `get_county_groundwater_stats()`: Returns summary statistics by county

## Frontend Application

The frontend is a React/TypeScript application located in the `frontend/` directory that provides an interactive map interface for exploring groundwater monitoring data.

### Frontend Architecture

- **Framework**: React 18 with TypeScript and Vite
- **Map Library**: Mapbox GL JS with clustering support
- **Database Client**: Supabase JavaScript client
- **Styling**: Inline styles with dark theme
- **Build Tool**: Vite for fast development and building

### Key Frontend Components

- `MapView.tsx`: Main map component with Mapbox integration and clustering
- `supabase.ts`: Database client and API functions for fetching groundwater data
- `App.tsx`: Root application component

### Frontend Features

- **Full-Screen Map Interface**: Edge-to-edge Mapbox map with overlay sidebar design
- **Collapsible Sidebar**: Left sidebar with Map Layers panel that slides over the map
- **Smart Clustering**: Sites automatically cluster/uncluster based on zoom level (max zoom 10, 30px radius)
- **Color-coded Markers**: Sites colored by measurement data volume (red: 10+, orange: 3-10, blue: 0-3)
- **Rich Popups**: Detailed site information including latest measurements, data spans, and temporal information
- **Professional UI**: Dark theme with water3D branding and top navigation banner
- **Layer Controls**: Checkbox interface for "Groundwater Historical Sites" layer
- **Floating Legend**: Overlay legend showing data volume indicators and site counts

### Frontend Environment Setup

Requires `frontend/.env.local` file with:
- `VITE_SUPABASE_URL`: Supabase project URL  
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous/public key
- `VITE_MAPBOX_ACCESS_TOKEN`: Mapbox public access token

### Running Frontend

```bash
cd frontend
npm install
npm run dev
```

### Frontend Data Flow

1. `fetchAllSitesWithMeasurementData()` retrieves all sites with measurement counts and temporal data
2. Sites are converted to GeoJSON format for Mapbox clustering
3. Mapbox renders clustered/individual markers with color coding based on measurement volume
4. Click events show detailed popups with formatted temporal information
5. Sidebar overlay provides layer controls without affecting map size or position

### Frontend Layout Structure

- **Top Banner** (60px): water3D logo, title, and branding
- **Map Container**: Full viewport underneath all overlays (z-index: 1)
- **Sidebar Overlay**: Slides in/out from left (300px width, z-index: 100)
- **Toggle Button**: Appears when sidebar closed (z-index: 200)
- **Legend Overlay**: Fixed top-right position (z-index: 1000)

### CSS Architecture

- **Edge-to-edge layout** with aggressive CSS resets using `!important`
- **Fixed positioning** for html, body, #root, and main container
- **Overlay design** where map stays full-width and sidebar slides over it
- **TypeScript integration** with proper GeoJSON and Mapbox types

### Database Schema

The frontend connects to two main Supabase tables:

#### `groundwater_monitoring_sites`
- Primary key: `monitoring_location_number`
- Contains site metadata, coordinates, and administrative information
- Used for site listings and basic information display

#### `groundwater_time_series` 
- Contains measurement data with temporal information
- Links to sites via `monitoring_location_id`
- Includes measurement values, timestamps, units, and quality indicators
- Used for data volume calculations and measurement displays