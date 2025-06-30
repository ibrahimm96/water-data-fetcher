import type { RawTimeSeriesData } from '../../lib/groundwater/dataUtils'

/**
 * Unified interface for all Draggable Panel components and their data requirements
 */
export interface DraggablePanelData {
  // Site identification
  siteId: string
  siteName: string
  
  // Panel state
  isVisible: boolean
  isLoading: boolean
  error: string | null
  
  // Chart/time series data
  chartData: {
    data: Array<{ date: number; value: number; dateString: string }>
    unit: string | null
    variable_name: string | null
    dateRange: { start: string; end: string } | null
    totalPoints: number
    rawData?: RawTimeSeriesData[]
  } | null
  
  // Event handlers
  onClose: () => void
}

/**
 * Props for individual tab components within the Draggable Panel
 */
export interface DraggablePanelTabProps {
  data: DraggablePanelData
}

/**
 * Type for the active tab state
 */
export type ActiveTab = 'chart' | 'statistics' | 'table'