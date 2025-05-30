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
  monitoring_location_id: string
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
    .eq('monitoring_location_id', locationId)
    .order('measurement_datetime', { ascending: false })
  
  if (error) throw error
  return data as GroundwaterTimeSeries[]
}

export const fetchRecentMeasurements = async (limit = 100) => {
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

export const fetchAllSitesWithMeasurementData = async () => {
  // Get all sites with measurement counts and time data using a single query
  const { data, error } = await supabase
    .from('groundwater_time_series')
    .select(`
      monitoring_location_id,
      site_name,
      county_code,
      state_code,
      latitude,
      longitude,
      measurement_datetime,
      measurement_value,
      unit,
      variable_name
    `)
    .not('monitoring_location_id', 'is', null)
    .not('measurement_datetime', 'is', null)
    .not('measurement_value', 'is', null)
    .order('measurement_datetime', { ascending: false })
  
  if (error) throw error
  
  // Group measurements by site and get latest data
  const siteCounts = data.reduce((acc: any, row) => {
    const locationId = row.monitoring_location_id
    if (!acc[locationId]) {
      acc[locationId] = {
        monitoring_location_id: locationId,
        site_name: row.site_name,
        county_code: row.county_code,
        state_code: row.state_code,
        latitude: row.latitude,
        longitude: row.longitude,
        measurement_count: 0,
        latest_measurement: null,
        earliest_measurement: null,
        latest_value: null,
        unit: null,
        variable_name: null
      }
    }
    
    acc[locationId].measurement_count++
    
    // Store latest measurement info (first one due to ordering)
    if (!acc[locationId].latest_measurement) {
      acc[locationId].latest_measurement = row.measurement_datetime
      acc[locationId].latest_value = row.measurement_value
      acc[locationId].unit = row.unit
      acc[locationId].variable_name = row.variable_name
    }
    
    // Update earliest measurement (last one encountered)
    acc[locationId].earliest_measurement = row.measurement_datetime
    
    return acc
  }, {})
  
  // Convert to array and sort by measurement count
  const sortedSites = Object.values(siteCounts)
    .sort((a: any, b: any) => b.measurement_count - a.measurement_count)
  
  return sortedSites
}