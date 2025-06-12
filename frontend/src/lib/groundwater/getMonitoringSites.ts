import { supabase } from '../client'

export const getMonitoringSites = async () => {
  const { data, error } = await supabase
    .from('groundwater_monitoring_sites')
    .select('*')
    .order('monitoring_location_name')

  if (error) throw error
  return data
}