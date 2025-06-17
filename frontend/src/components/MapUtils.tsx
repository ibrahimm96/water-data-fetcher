export interface ChartData {
  data: Array<{ date: number; value: number; dateString: string }>
  unit: string | null
  variable_name: string | null
  dateRange: { start: string; end: string } | null
  totalPoints?: number
}

export interface MapViewProps {
  measurementFilter: {
    min: number
    max: number | null
  }
  setChartVisible: (visible: boolean) => void
  setChartData: (data: ChartData | null) => void
  setChartError: (error: string | null) => void
  setChartLoading: (loading: boolean) => void
  setSelectedSite: (site: { id: string; name: string } | null) => void
  setFilteredSiteCount: (count: number) => void
}