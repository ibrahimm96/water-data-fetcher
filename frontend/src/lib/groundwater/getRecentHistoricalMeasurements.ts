import { supabase } from '../client'

export const getRecentHistoricalMeasurements = async (limit = 10000) => {
  const { data, error } = await supabase
    .from('groundwater_time_series')
    .select('*')
    .not('measurement_datetime', 'is', null)
    .not('measurement_value', 'is', null)
    .order('measurement_datetime', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}