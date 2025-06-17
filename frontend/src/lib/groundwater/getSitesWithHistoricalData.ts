import { supabase } from '../client'
import { parseGeometryPoint } from '../parseGeometryPoint'
import type { GroundwaterMonitoringSite } from './types'

type SiteWithCount = GroundwaterMonitoringSite & { measurement_count?: number }

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

  const allSites = batch.map((site) => {
    const coords = parseGeometryPoint(site.geometry)
    if (!coords) return null

    const mapped: SiteWithCount = {
      id: 0,
      inserted_at: '',
      updated_at: '',
      monitoring_location_id: String(site.monitoring_location_id || site.monitoring_location_number || ''),
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
      measurement_count: Number(site.measurement_count || 0)
    }

    return mapped
  }).filter(Boolean) as SiteWithCount[]

  console.log(`Finished loading ${allSites.length} sites total`)
  return allSites
}
