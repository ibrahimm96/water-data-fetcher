import { supabase } from '../client'

export const inspectSitesView = async () => {
  const { data, error } = await supabase
    .from('gw_sites_with_historical_data')
    .select('*')
    .limit(5)

  if (error) throw error

  const { count } = await supabase
    .from('gw_sites_with_historical_data')
    .select('*', { count: 'exact', head: true })

  const columns = data && data.length > 0 ? Object.keys(data[0]) : []
  return { sample: data, totalCount: count, columns }
}