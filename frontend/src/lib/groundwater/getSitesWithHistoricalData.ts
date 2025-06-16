import { supabase } from '../client'
import { parseGeometryPoint } from '../parseGeometryPoint'
import type { GroundwaterMonitoringSite } from './types'

type SiteWithCount = GroundwaterMonitoringSite & { measurement_count?: number }

export const getSitesWithHistoricalData = async (): Promise<SiteWithCount[]> => {
  const allSites: SiteWithCount[] = []
  const batchSize = 1000
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data: batch, error } = await supabase
      .from('gw_sites_with_historical_data')
      .select('monitoring_location_number, monitoring_location_name, state_code, county_code, geometry, agency_code')
      .range(offset, offset + batchSize - 1)
      .order('monitoring_location_number')

    if (error) throw error
    if (!batch || batch.length === 0) break

    const batchSites = batch.map(site => {
      const coords = parseGeometryPoint(site.geometry)
      if (!coords) return null

      const mapped: SiteWithCount = {
        id: 0, // or proper fallback/default if applicable
        inserted_at: '',
        updated_at: '',
        monitoring_location_id: site.monitoring_location_number,
        geometry: {
            type: 'Point',
            coordinates: [coords.longitude, coords.latitude]
        },
        agency_code: site.agency_code,
        monitoring_location_number: site.monitoring_location_number,
        monitoring_location_name: site.monitoring_location_name,
        state_code: site.state_code,
        county_code: site.county_code,
        site_type_code: null,
        hydrologic_unit_code: null,
        aquifer_code: null,
        aquifer_type_code: null,
        altitude: null,
        vertical_datum: null,
        measurement_count: 0
      }

      return mapped
    }).filter(Boolean) as SiteWithCount[]

    allSites.push(...batchSites)
    hasMore = batch.length === batchSize
    offset += batchSize
  }

  const { data: measurements, error: countError } = await supabase
    .from('gw_historical_timeseries')
    .select('monitoring_location_number')
    .eq('variable_code', '72019')
    .not('measurement_datetime', 'is', null)
    .not('measurement_value', 'is', null)

  if (!countError && measurements) {
    const countMap = new Map<string, number>()
    measurements.forEach(row => {
      const id = row.monitoring_location_number
      countMap.set(id, (countMap.get(id) || 0) + 1)
    })
    allSites.forEach(site => {
      site.measurement_count = countMap.get(site.monitoring_location_id ?? '') || 0
    })
  }

  return allSites
}
