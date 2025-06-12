import { supabase } from '../client'

export const getSiteHistoricalRecords = async (locationId: string) => {
  const { data, error } = await supabase
    .from('groundwater_time_series')
    .select('*')
    .eq('monitoring_location_number', locationId)
    .eq('variable_code', '72019')
    .order('measurement_datetime', { ascending: false })

  if (error) throw error
  return data
}