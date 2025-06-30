import type { GroundwaterMonitoringSite } from '../../lib/groundwater/types'
import type { DraggablePanelData } from '../Draggable_Panel/types'

export interface MapViewProps {
  measurementFilter: {
    min: number
    max: number | null
  }
  setChartVisible: (visible: boolean) => void
  setChartData: (data: DraggablePanelData['chartData']) => void
  setChartError: (error: string | null) => void
  setChartLoading: (loading: boolean) => void
  setSelectedSite: (site: { id: string; name: string } | null) => void
  setFilteredSiteCount: (count: number) => void
  setFilteredSites: (sites: GroundwaterMonitoringSite[]) => void
  //mapSettings: MapSettings
}