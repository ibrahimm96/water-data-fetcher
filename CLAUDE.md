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
- **Database**: Supabase with two main tables:
  - `groundwater_monitoring_sites`: Site metadata and locations
  - `groundwater_time_series`: Historical measurement data
- **Configuration**: Environment variables for Supabase connection (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

## Key Scripts

- `fetch_gw_sites.js`: Fetches groundwater monitoring site metadata for Merced County and upserts to Supabase
- `fetch_gw_historical.js`: Fetches time series groundwater level data for Merced County and inserts to Supabase  
- `test.js`: Legacy reference script (not actively used)
- `supabase.js`: Database client configuration

## Running Scripts

Use conda base environment as specified in global instructions:
```bash
/opt/anaconda3/bin/node fetch_gw_sites.js
/opt/anaconda3/bin/node fetch_gw_historical.js
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

- **Interactive Map**: Mapbox-powered map centered on California
- **Smart Clustering**: Sites automatically cluster/uncluster based on zoom level
- **Color-coded Markers**: Sites colored by measurement data volume (red: 10+, orange: 3-10, blue: 0-3)
- **Rich Popups**: Detailed site information including latest measurements, data spans, and temporal information
- **Responsive Design**: Full-screen layout optimized for exploration
- **Dark Theme**: Professional dark color scheme

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
3. Mapbox renders clustered/individual markers with color coding
4. Click events show detailed popups with formatted temporal information