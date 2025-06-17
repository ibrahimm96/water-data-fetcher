import { supabase } from '../client'
import { parseGeometryPoint } from '../parseGeometryPoint'
import type { GroundwaterMonitoringSite } from './types'

type SiteWithCount = GroundwaterMonitoringSite & { measurement_count?: number }

export const getSitesWithHistoricalData = async (maxSites?: number): Promise<SiteWithCount[]> => {
  const allSites: SiteWithCount[] = []
  const batchSize = 1000
  let from = 0
  let totalLoaded = 0
  const targetLimit = maxSites || 100000 // Default to loading up to 100k sites

  console.log(`Loading sites from gw_sites_with_historical_data view (target: ${targetLimit})...`)

  while (totalLoaded < targetLimit) {
    const to = Math.min(from + batchSize - 1, targetLimit - 1)
    
    console.log(`Fetching batch: ${from} to ${to}`)
    
    const { data: batch, error } = await supabase
      .from('gw_sites_with_historical_data')
      .select('*')
      .order('monitoring_location_number', { ascending: true })
      .range(from, to)

    if (error) {
      console.error(`Error loading batch ${from}-${to}:`, error)
      break
    }

    if (!batch || batch.length === 0) {
      console.log('No more sites to load')
      break
    }

    // Log available columns from first batch
    if (from === 0) {
      console.log('Available columns in view:', Object.keys(batch[0]))
    }

    const batchSites = batch.map((site) => {
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

    allSites.push(...batchSites)
    totalLoaded += batch.length

    console.log(`Loaded batch: ${batch.length} sites (total: ${totalLoaded})`)

    // If we got fewer than requested, we've reached the end
    if (batch.length < batchSize) {
      console.log('Reached end of data')
      break
    }

    from = to + 1
  }

  console.log(`Finished loading ${allSites.length} sites total`)
  return allSites
}
