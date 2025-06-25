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
- `DraggablePanel.tsx`: Draggable panel with tabbed interface for site details, charts, and data tables
- `ChartTab.tsx`: Time series chart visualization using MUI X Charts
- `supabase.ts`: Database client and API functions for fetching groundwater data
- `dataUtils.ts`: **NEW** Centralized data processing utilities for consistent styling and formatting
- `App.tsx`: Root application component

### Frontend Features

- **Full-Screen Map Interface**: Edge-to-edge Mapbox map with overlay sidebar design
- **Collapsible Sidebar**: Left sidebar with Map Layers panel that slides over the map
- **Smart Clustering**: Sites automatically cluster/uncluster based on zoom level (max zoom 10, 30px radius)
- **Color-coded Markers**: Sites colored by measurement data volume (red: 10+, orange: 3-10, blue: 0-3)
- **Rich Popups**: Detailed site information including latest measurements, data spans, and temporal information
- **Draggable Data Panels**: Interactive panels with Chart, Statistics, and Data Table tabs for detailed site analysis
- **Centralized Data Processing**: Consistent styling and formatting across map markers and data panels
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
2. Sites are processed through centralized `dataUtils.ts` functions for consistent formatting
3. `sitesToEnhancedGeoJSON()` converts sites to GeoJSON format with standardized marker styling
4. Mapbox renders clustered/individual markers with color coding based on measurement volume
5. Click events show detailed popups using `formatSitePopupContent()` for consistent formatting
6. Site selection opens draggable panels with formatted chart data and data quality indicators
7. Sidebar overlay provides layer controls without affecting map size or position

### Frontend Layout Structure

- **Top Banner** (60px): water3D logo, title, and branding
- **Map Container**: Full viewport underneath all overlays (z-index: 1)
- **Sidebar Overlay**: Slides in/out from left (300px width, z-index: 100)
- **Toggle Button**: Appears when sidebar closed (z-index: 200)
- **Draggable Panels**: Interactive data panels (z-index: 2000)
- **Legend Overlay**: Fixed top-right position (z-index: 1000)

### CSS Architecture

- **Edge-to-edge layout** with aggressive CSS resets using `!important`
- **Fixed positioning** for html, body, #root, and main container
- **Overlay design** where map stays full-width and sidebar slides over it
- **TypeScript integration** with proper GeoJSON and Mapbox types

### Centralized Data Processing (NEW)

The `frontend/src/lib/groundwater/dataUtils.ts` module provides centralized utilities for consistent data processing across components:

#### Key Functions
- `sitesToEnhancedGeoJSON()`: Converts monitoring sites to GeoJSON with consistent marker styling
- `getMarkerStyle()`: Standardized marker colors and sizes based on measurement count
- `formatSitePopupContent()`: Consistent popup formatting with site information
- `formatChartData()`: Standardized chart data formatting for panels
- `getDataQuality()`: Data quality indicators (high/medium/low) with color coding
- `formatDate()`: Consistent date formatting across components

#### Data Quality System
- **High**: 10+ measurements (green badge, red markers)
- **Medium**: 3-9 measurements (orange badge, orange markers)  
- **Low**: 0-2 measurements (gray badge, blue markers)

#### Benefits
- Consistent styling across map markers and data panels
- Centralized color scheme and sizing logic
- Standardized popup and data formatting
- Enhanced maintainability and code reuse
- Type-safe data transformations

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

## Centralized Data Management System (NEW)

The frontend now features a comprehensive centralized data management system that replaces scattered data operations with a unified, efficient approach.

### Core Components

#### **Enhanced dataUtils.ts** - Central Data Hub
- **Location**: `frontend/src/lib/groundwater/dataUtils.ts`
- **Purpose**: Centralized data operations, caching, and export functionality
- **Key Features**:
  - Singleton DataCache with intelligent TTL management
  - Unified CSV export system for sites and time-series data
  - Raw database data preservation and processing
  - Consistent data transformations and styling
  - Backward compatibility with legacy functions

#### **Data Cache System**
```typescript
// Access the centralized cache
import { getDataCache } from '../lib/groundwater/dataUtils'

const cache = getDataCache()
const filteredSites = cache.getFilteredSites()
const timeSeriesData = cache.getTimeSeriesData(siteId)
```

#### **Export System**
```typescript
// Export filtered sites data
exportSitesData(sites, filename, options)

// Export raw time-series data with all database fields
exportTimeSeriesData(rawData, siteName, siteId, filename, options)
```

### Key Interfaces

#### **RawTimeSeriesData**
```typescript
interface RawTimeSeriesData {
  measurement_datetime: string
  measurement_value: number
  unit: string | null
  variable_name: string | null
  variable_code?: string | null
  qualifiers?: string[] | null
  method_id?: number | null
  [key: string]: string | number | boolean | null | string[] | undefined
}
```

#### **ProcessedTimeSeriesData**
```typescript
interface ProcessedTimeSeriesData {
  data: Array<{ date: number; value: number; dateString: string }>
  unit: string | null
  variable_name: string | null
  dateRange: { start: string; end: string } | null
  totalPoints: number
  rawData: RawTimeSeriesData[] // Original database records
}
```

### Data Flow Architecture

#### **Original Database Data Preservation**
1. **Raw Data Fetching**: `getSiteHistoricalChartData()` includes `rawData` field with complete database records
2. **Component Integration**: DraggablePanel → DataTable receives raw data for export
3. **Export Functionality**: DataTable download button exports original database data with all fields

#### **Cache Management**
- **Sites Cache**: All monitoring sites with measurement counts and metadata
- **Time-Series Cache**: Individual site data with 5-minute TTL
- **Filter State**: Centralized measurement count filtering
- **Automatic Cleanup**: Expired cache entries removed automatically

### Export Capabilities

#### **Sites Export** (Sidebar CSV Button)
- **Standard Fields**: Site IDs, names, coordinates, measurement counts
- **Enhanced Metadata**: Data quality levels and descriptions
- **Filtering**: Exports only currently filtered sites
- **Filename**: Auto-generated with date stamp

#### **Time-Series Export** (DataTable CSV Button) 
- **Raw Database Fields**: Complete original data structure
- **Configurable Options**:
  - `includeMetadata`: All additional database fields
  - `includeQualifiers`: Data quality indicators
  - `dateFormat`: ISO, local, or short format
- **Intelligent Fallback**: Uses processed data if raw data unavailable
- **Filename**: Site-specific with timestamp

### Usage Examples

#### **Centralized Site Management**
```typescript
// Set and filter sites
const cache = getDataCache()
cache.setSites(allSites)
cache.setFilter({ min: 10, max: null })
const filteredSites = cache.getFilteredSites()
```

#### **Time-Series Data with Caching**
```typescript
// Check cache first, fetch if needed
let timeSeriesData = cache.getTimeSeriesData(siteId)
if (!timeSeriesData) {
  const rawData = await getSiteHistoricalChartData(siteId)
  cache.setTimeSeriesData(siteId, rawData)
  timeSeriesData = rawData
}
```

#### **Advanced Export Options**
```typescript
// Export with full metadata
exportTimeSeriesData(rawData, siteName, siteId, 'custom_filename.csv', {
  includeMetadata: true,
  includeQualifiers: true,
  dateFormat: 'iso'
})
```

### Performance Optimizations

- **Intelligent Caching**: 5-minute TTL prevents unnecessary API calls
- **Request Deduplication**: Prevents duplicate data fetching
- **Memory Management**: Automatic cache cleanup for expired entries
- **Memoized Transformations**: Expensive operations cached
- **Background Processing**: Non-blocking data operations

### Migration and Compatibility

- **Backward Compatibility**: All existing components continue to work
- **Legacy Functions**: Maintained with deprecation notices
- **Gradual Migration**: Components can be updated incrementally
- **Type Safety**: Strict TypeScript interfaces throughout

### Benefits

1. **Eliminates Data Duplication**: Single source of truth for all data
2. **Improved Performance**: Intelligent caching reduces API calls
3. **Enhanced Export**: Complete database data with configurable options
4. **Better Maintainability**: Centralized logic easier to update
5. **Type Safety**: Comprehensive interfaces prevent runtime errors
6. **User Experience**: Faster data access and comprehensive exports