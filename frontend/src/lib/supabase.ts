import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:')
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl)
  console.error('VITE_SUPABASE_ANON_KEY:', !!supabaseAnonKey)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for your database tables
export interface GroundwaterMonitoringSite {
  id: number
  inserted_at: string
  updated_at: string
  monitoring_location_id: string | null
  geometry: any | null
  agency_code: string | null
  monitoring_location_number: string
  monitoring_location_name: string | null
  state_code: string | null
  county_code: string | null
  site_type_code: string | null
  hydrologic_unit_code: string | null
  aquifer_code: string | null
  aquifer_type_code: string | null
  altitude: number | null
  vertical_datum: string | null
}

export interface GroundwaterTimeSeries {
  id: number
  monitoring_location_number: string
  site_name: string | null
  agency_code: string | null
  huc_code: string | null
  state_code: string | null
  county_code: string | null
  latitude: number | null
  longitude: number | null
  geometry: any | null
  variable_code: string | null
  variable_name: string | null
  variable_description: string | null
  unit: string | null
  variable_id: number | null
  measurement_datetime: string | null
  measurement_value: number | null
  qualifiers: string[] | null
  method_id: number | null
}

// API functions
export const fetchGroundwaterSites = async () => {
  const { data, error } = await supabase
    .from('groundwater_monitoring_sites')
    .select('*')
    .order('monitoring_location_name')
  
  if (error) throw error
  return data as GroundwaterMonitoringSite[]
}

export const fetchTimeSeriesForSite = async (locationId: string) => {
  const { data, error } = await supabase
    .from('groundwater_time_series')
    .select('*')
    .eq('monitoring_location_number', locationId)
    .order('measurement_datetime', { ascending: false })
  
  if (error) throw error
  return data as GroundwaterTimeSeries[]
}

export const fetchRecentMeasurements = async (limit = 10000) => {
  const { data, error } = await supabase
    .from('groundwater_time_series')
    .select('*')
    .not('measurement_datetime', 'is', null)
    .not('measurement_value', 'is', null)
    .order('measurement_datetime', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data as GroundwaterTimeSeries[]
}

// Step 1: Investigate the gw_sites_with_time_series_data view
export const investigateGWSitesView = async () => {
  console.log('🔍 Investigating gw_sites_with_time_series_data view...')
  
  try {
    // First, get a sample of records to understand the schema
    const { data: sampleData, error: sampleError } = await supabase
      .from('gw_sites_with_time_series_data')
      .select('*')
      .limit(5)
    
    if (sampleError) {
      console.error('❌ Error accessing view:', sampleError)
      return { success: false, error: sampleError }
    }
    
    console.log('View accessible! Sample records:', sampleData)
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('gw_sites_with_time_series_data')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.warn('Could not get count:', countError)
    } else {
      console.log(`📊 Total sites in view: ${count}`)
    }
    
    // Analyze the schema
    if (sampleData && sampleData.length > 0) {
      const sampleRecord = sampleData[0]
      const columns = Object.keys(sampleRecord)
      console.log('Available columns:', columns)
      
      // Check for essential columns
      const hasCoordinates = columns.includes('latitude') && columns.includes('longitude')
      const hasLocationId = columns.includes('monitoring_location_id') || columns.includes('monitoring_location_number')
      
      console.log(`Has coordinates: ${hasCoordinates}`)
      console.log(`Has location ID: ${hasLocationId}`)
    }
    
    return {
      success: true,
      totalCount: count,
      sampleData,
      columns: sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : []
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error }
  }
}

// Helper function to parse WKT POINT geometry
const parseWKTPoint = (wktGeometry: string): { latitude: number; longitude: number } | null => {
  if (!wktGeometry) return null
  
  // Parse POINT(-117.083475 32.5910055555556) format
  const match = wktGeometry.match(/POINT\(([^)]+)\)/)
  if (!match) return null
  
  const coords = match[1].split(' ')
  if (coords.length !== 2) return null
  
  const longitude = parseFloat(coords[0])
  const latitude = parseFloat(coords[1])
  
  if (isNaN(longitude) || isNaN(latitude)) return null
  
  return { latitude, longitude }
}

// New simplified function: Load directly from the view (much faster!)
export const fetchAllSitesWithMeasurementData = async () => {
  console.log('🚀 Loading sites directly from gw_sites_with_time_series_data view...')
  
  try {
    const allSites: any[] = []
    const batchSize = 1000 // Can use larger batches since it's a single query per batch
    let offset = 0
    let hasMore = true
    
    while (hasMore) {
      console.log(`Loading batch ${Math.floor(offset / batchSize) + 1}...`)
      
      const { data: batch, error } = await supabase
        .from('gw_sites_with_time_series_data')
        .select(`
          monitoring_location_number,
          monitoring_location_name,
          state_code,
          county_code,
          geometry,
          agency_code
        `)
        .range(offset, offset + batchSize - 1)
        .order('monitoring_location_number')
      
      if (error) {
        console.error(`Error fetching batch:`, error)
        throw error
      }
      
      if (!batch || batch.length === 0) {
        hasMore = false
        break
      }
      
      // Process this batch - parse WKT geometry and format for frontend
      const batchSites = batch
        .map(site => {
          const coords = parseWKTPoint(site.geometry)
          
          if (!coords) {
            console.warn(`Could not parse geometry for site ${site.monitoring_location_number}: ${site.geometry}`)
            return null
          }
          
          return {
            monitoring_location_id: site.monitoring_location_number, // Keep old name for frontend compatibility
            site_name: site.monitoring_location_name,
            county_code: site.county_code,
            state_code: site.state_code,
            latitude: coords.latitude,
            longitude: coords.longitude,
            agency_code: site.agency_code,
            // Placeholder values - will be loaded on-demand when clicked
            measurement_count: null,
            latest_measurement: null,
            earliest_measurement: null,
            latest_value: null,
            unit: null,
            variable_name: null
          }
        })
        .filter(site => site !== null) // Remove sites with invalid geometry
      
      allSites.push(...batchSites)
      
      console.log(`Loaded ${batchSites.length} sites (${allSites.length} total)`)
      
      // Check if we got fewer results than requested (means we're at the end)
      hasMore = batch.length === batchSize
      offset += batchSize
      
      // Safety check
      if (offset > 50000) {
        console.warn('Reached safety limit, stopping')
        break
      }
    }
    
    console.log(`🎉 SUCCESS! Loaded ${allSites.length} sites from view`)
    console.log(`⚡ Much faster - single table query instead of complex joins!`)
    
    return allSites
    
  } catch (error) {
    console.error('💥 Error loading sites from view:', error)
    throw error
  }
}

// Progressive loading version with callback support
export const fetchAllSitesWithMeasurementDataProgressive = async (onBatchLoaded?: (sites: any[], totalLoaded: number, totalExpected: number) => void) => {
  console.log('🚀 Loading sites progressively from view...')
  
  try {
    // Get total count for progress tracking
    const { count: totalSites, error: countError } = await supabase
      .from('gw_sites_with_time_series_data')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('Error getting site count:', countError)
      throw countError
    }
    
    console.log(`📊 Total sites to load: ${totalSites}`)
    
    const allSites: any[] = []
    const batchSize = 500 // Medium batch size for progressive loading
    let offset = 0
    let hasMore = true
    
    while (hasMore) {
      const batchNum = Math.floor(offset / batchSize) + 1
      const totalBatches = Math.ceil((totalSites || 0) / batchSize)
      console.log(`📦 Loading batch ${batchNum}/${totalBatches}...`)
      
      const { data: batch, error } = await supabase
        .from('gw_sites_with_time_series_data')
        .select(`
          monitoring_location_number,
          monitoring_location_name,
          state_code,
          county_code,
          geometry,
          agency_code
        `)
        .range(offset, offset + batchSize - 1)
        .order('monitoring_location_number')
      
      if (error) {
        console.error(`Error fetching batch ${batchNum}:`, error)
        break
      }
      
      if (!batch || batch.length === 0) {
        hasMore = false
        break
      }
      
      // Process this batch
      const batchSites = batch
        .map(site => {
          const coords = parseWKTPoint(site.geometry)
          
          if (!coords) return null
          
          return {
            monitoring_location_id: site.monitoring_location_number,
            site_name: site.monitoring_location_name,
            county_code: site.county_code,
            state_code: site.state_code,
            latitude: coords.latitude,
            longitude: coords.longitude,
            agency_code: site.agency_code,
            measurement_count: null,
            latest_measurement: null,
            earliest_measurement: null,
            latest_value: null,
            unit: null,
            variable_name: null
          }
        })
        .filter(site => site !== null)
      
      allSites.push(...batchSites)
      
      // Call callback for progressive UI updates
      if (onBatchLoaded) {
        onBatchLoaded(batchSites, allSites.length, totalSites || 0)
      }
      
      console.log(`Batch ${batchNum} complete: ${batchSites.length} sites (${allSites.length}/${totalSites} total)`)
      
      hasMore = batch.length === batchSize
      offset += batchSize
    }
    
    console.log(`🎉 Progressive loading complete! Loaded ${allSites.length} sites`)
    return allSites
    
  } catch (error) {
    console.error('💥 Error in progressive loading:', error)
    throw error
  }
}

// New function: Fetch time-series summary data on demand for a specific site
export const fetchSiteTimeSeriesSummary = async (locationId: string) => {
  console.log(`Loading time-series summary for site: ${locationId}`)
  
  try {
    // Get measurement count and latest measurements in one query
    const { data: measurements, error: measurementError, count } = await supabase
      .from('groundwater_time_series')
      .select('measurement_datetime, measurement_value, unit, variable_name', { count: 'exact' })
      .eq('monitoring_location_number', locationId)
      .not('measurement_datetime', 'is', null)
      .not('measurement_value', 'is', null)
      .order('measurement_datetime', { ascending: false })
      .limit(5) // Get latest 5 measurements for context
    
    if (measurementError) {
      console.error(`Error fetching measurements for ${locationId}:`, measurementError)
      throw measurementError
    }
    
    if (!count || count === 0 || !measurements || measurements.length === 0) {
      return {
        measurement_count: 0,
        latest_measurement: null,
        earliest_measurement: null,
        latest_value: null,
        unit: null,
        variable_name: null,
        recent_measurements: []
      }
    }
    
    // Get earliest measurement if we have data
    let earliestMeasurement = null
    if (count > 1) {
      const { data: earliestData } = await supabase
        .from('groundwater_time_series')
        .select('measurement_datetime')
        .eq('monitoring_location_number', locationId)
        .not('measurement_datetime', 'is', null)
        .not('measurement_value', 'is', null)
        .order('measurement_datetime', { ascending: true })
        .limit(1)
      
      earliestMeasurement = earliestData?.[0]?.measurement_datetime || null
    } else {
      earliestMeasurement = measurements[0]?.measurement_datetime || null
    }
    
    const summary = {
      measurement_count: count,
      latest_measurement: measurements[0]?.measurement_datetime || null,
      earliest_measurement: earliestMeasurement,
      latest_value: measurements[0]?.measurement_value || null,
      unit: measurements[0]?.unit || null,
      variable_name: measurements[0]?.variable_name || null,
      recent_measurements: measurements.slice(0, 5) // Include recent measurements for context
    }
    
    console.log(`Loaded ${count} measurements for site ${locationId}`)
    return summary
    
  } catch (error) {
    console.error(`Error fetching time-series summary for ${locationId}:`, error)
    throw error
  }
}

// New function: Fetch ALL time-series data for charting
export const fetchSiteTimeSeriesForChart = async (locationId: string) => {
  console.log(`📈 Loading full time-series data for chart: ${locationId}`)
  
  try {
    // Get all measurements for the site (for charting)
    const { data: allMeasurements, error } = await supabase
      .from('groundwater_time_series')
      .select('measurement_datetime, measurement_value, unit, variable_name')
      .eq('monitoring_location_number', locationId)
      .not('measurement_datetime', 'is', null)
      .not('measurement_value', 'is', null)
      .order('measurement_datetime', { ascending: true }) // Chronological order for chart
    
    if (error) {
      console.error(`❌ Error fetching chart data for ${locationId}:`, error)
      throw error
    }
    
    if (!allMeasurements || allMeasurements.length === 0) {
      return {
        data: [],
        unit: null,
        variable_name: null,
        dateRange: null
      }
    }
    
    // Process data for MUI LineChart
    const chartData = allMeasurements.map(measurement => ({
      date: new Date(measurement.measurement_datetime).getTime(), // Convert to timestamp for chart
      value: measurement.measurement_value,
      dateString: measurement.measurement_datetime // Keep original for display
    }))
    
    const dateRange = {
      start: allMeasurements[0].measurement_datetime,
      end: allMeasurements[allMeasurements.length - 1].measurement_datetime
    }
    
    console.log(`✅ Loaded ${allMeasurements.length} measurements for chart`)
    
    return {
      data: chartData,
      unit: allMeasurements[0].unit,
      variable_name: allMeasurements[0].variable_name,
      dateRange: dateRange,
      totalPoints: allMeasurements.length
    }
    
  } catch (error) {
    console.error(`💥 Error fetching chart data for ${locationId}:`, error)
    throw error
  }
}