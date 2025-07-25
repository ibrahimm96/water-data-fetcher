import { supabase } from '../client'
import { parseGeometryPoint } from '../parseGeometryPoint'
import type { GroundwaterMonitoringSite } from './types'

type SiteWithCount = GroundwaterMonitoringSite & { 
  measurement_count?: number
  actualDateRange?: {
    startYear: number
    endYear: number
    firstMeasurement: string
    lastMeasurement: string
  }
}

export const getSitesWithHistoricalData = async (maxSites?: number): Promise<SiteWithCount[]> => {
  const targetLimit = maxSites || 100000 // Default to 100k

  console.log(`Fetching up to ${targetLimit} sites from gw_sites_with_historical_data view...`)

  const { data: batch, error } = await supabase
    .from('gw_sites_with_historical_data')
    .select('*')
    .order('monitoring_location_number', { ascending: true })
    .range(0, targetLimit - 1) // Supabase range is inclusive

  if (error) {
    console.error('Error fetching sites:', error)
    throw error
  }

  if (!batch || batch.length === 0) {
    console.log('No sites returned')
    return []
  }

  console.log('Available columns in view:', Object.keys(batch[0]))

  // Date ranges are now included in the materialized view
  console.log('Using date_range column from materialized view for filtering')

  const allSites = batch.map((site) => {
    const coords = parseGeometryPoint(site.geometry)
    if (!coords) return null

    const siteId = String(site.monitoring_location_id || site.monitoring_location_number || '')
    
    // Parse the date_range column if available
    let actualDateRange = undefined
    if (site.date_range) {
      try {
        // Parse the date_range array like ["2013", "2020"]
        const dateArray = Array.isArray(site.date_range) ? site.date_range : JSON.parse(site.date_range)
        if (dateArray && dateArray.length >= 2) {
          const startYear = parseInt(dateArray[0])
          const endYear = parseInt(dateArray[1])
          if (!isNaN(startYear) && !isNaN(endYear)) {
            actualDateRange = {
              startYear,
              endYear,
              firstMeasurement: `${startYear}-01-01T00:00:00Z`,
              lastMeasurement: `${endYear}-12-31T23:59:59Z`
            }
          }
        }
      } catch (error) {
        console.warn('Error parsing date_range for site', siteId, ':', error)
      }
    }
    
    const mapped: SiteWithCount = {
      id: 0,
      inserted_at: '',
      updated_at: '',
      monitoring_location_id: siteId,
      geometry: {
        type: 'Point',
        coordinates: [coords.longitude, coords.latitude]
      },
      agency_code: String(site.agency_code || ''),
      monitoring_location_number: String(site.monitoring_location_number || site.monitoring_location_id || ''),
      monitoring_location_name: String(site.monitoring_location_name || ''),
      state_code: String(site.state_code || ''),
      county_code: String(site.county_code || ''),
      site_type_code: site.site_type_code ? String(site.site_type_code) : null,
      hydrologic_unit_code: site.hydrologic_unit_code ? String(site.hydrologic_unit_code) : null,
      aquifer_code: site.aquifer_code ? String(site.aquifer_code) : null,
      aquifer_type_code: site.aquifer_type_code ? String(site.aquifer_type_code) : null,
      altitude: site.altitude ? Number(site.altitude) : null,
      vertical_datum: site.vertical_datum ? String(site.vertical_datum) : null,
      measurement_count: Number(site.measurement_count || 0),
      min_value: site.min_value !== null && site.min_value !== undefined ? Number(site.min_value) : null,
      max_value: site.max_value !== null && site.max_value !== undefined ? Number(site.max_value) : null,
      avg_value: site.avg_value !== null && site.avg_value !== undefined ? Number(site.avg_value) : null,
      actualDateRange
    }

    return mapped
  }).filter(Boolean) as SiteWithCount[]

  console.log(`Finished loading ${allSites.length} sites total`)
  return allSites
}
