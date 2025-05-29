# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js data fetching application that retrieves groundwater monitoring data from USGS APIs and stores it in a Supabase database. The project focuses on California groundwater data, specifically for Merced County.

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