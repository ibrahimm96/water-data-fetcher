export interface ChartData {
  data: Array<{ date: number; value: number; dateString: string }>
  unit: string | null
  variable_name: string | null
  dateRange: { start: string; end: string } | null
  totalPoints?: number
}

// export interface MapSettings {
//   style: 'streets' | 'satellite' | 'dark' | 'light'
//   showCountyBorders: boolean
//   showLabels: boolean
//   enable3DTerrain: boolean
// }

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
  //mapSettings: MapSettings
}