import { supabase } from '../client'

export const getSiteHistoricalSummary = async (locationId: string) => {
  const { data: latest, error, count } = await supabase
    .from('gw_historical_timeseries')
    .select('measurement_datetime, measurement_value, unit, variable_name', { count: 'exact' })
    .eq('monitoring_location_number', locationId)
    .eq('variable_code', '72019')
    .not('measurement_datetime', 'is', null)
    .not('measurement_value', 'is', null)
    .order('measurement_datetime', { ascending: false })
    .limit(5)

  if (error) throw error

  let earliest = null
  if ((count ?? 0) > 1) {
    const { data } = await supabase
      .from('gw_historical_timeseries')
      .select('measurement_datetime')
      .eq('monitoring_location_number', locationId)
      .eq('variable_code', '72019')
      .not('measurement_datetime', 'is', null)
      .not('measurement_value', 'is', null)
      .order('measurement_datetime', { ascending: true })
      .limit(1)

    earliest = data?.[0]?.measurement_datetime || null
  } else {
    earliest = latest?.[0]?.measurement_datetime || null
  }

  return {
    measurement_count: count,
    latest_measurement: latest?.[0]?.measurement_datetime || null,
    earliest_measurement: earliest,
    latest_value: latest?.[0]?.measurement_value || null,
    unit: latest?.[0]?.unit || null,
    variable_name: latest?.[0]?.variable_name || null,
    recent_measurements: latest || []
  }
}
