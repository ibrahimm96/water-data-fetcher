import { supabase } from '../client'

export const getSiteHistoricalChartData = async (locationId: string) => {
  const { data, error } = await supabase
    .from('gw_historical_timeseries')
    .select('measurement_datetime, measurement_value, unit, variable_name')
    .eq('monitoring_location_number', locationId)
    .eq('variable_code', '72019')
    .not('measurement_datetime', 'is', null)
    .not('measurement_value', 'is', null)
    .order('measurement_datetime', { ascending: true })
    .limit(10000)

  if (error) throw error

  if (!data || data.length === 0) {
    return {
      data: [],
      unit: null,
      variable_name: null,
      dateRange: null,
      totalPoints: 0
    }
  }

  return {
    data: data.map(m => ({
      date: new Date(m.measurement_datetime).getTime(),
      value: m.measurement_value,
      dateString: m.measurement_datetime
    })),
    unit: data[0].unit,
    variable_name: data[0].variable_name,
    dateRange: {
      start: data[0].measurement_datetime,
      end: data[data.length - 1].measurement_datetime
    },
    totalPoints: data.length,
    rawData: data  // Include the original raw data from database
  }
}
