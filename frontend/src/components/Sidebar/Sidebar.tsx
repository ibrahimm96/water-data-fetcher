import type { GroundwaterMonitoringSite } from '../../lib/groundwater/types'
import { exportSitesData } from '../../lib/groundwater/dataUtils'
import { AddFilterSelector } from './AddFilterSelector'
import { ActiveFiltersList } from './ActiveFiltersList'
import { GroundwaterSection } from './GroundwaterSection'
import { SiteCountDisplay } from './SiteCountDisplay'
import { ExportButton } from '../ExportButton'
import { useState, useEffect } from 'react'

type SiteWithCount = GroundwaterMonitoringSite & {
  measurement_count?: number
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  measurementFilter: {
    min: number
    max: number | null
  }
  onMeasurementFilterChange: (filter: { min: number; max: number | null }) => void
  filteredSiteCount: number
  filteredSites: SiteWithCount[]
  dateFilter: {
    startYear: number
    endYear: number
  }
  onDateFilterChange: (filter: { startYear: number; endYear: number }) => void
  minMaxValueFilter: {
    min: number | null
    max: number | null
  }
  onMinMaxValueFilterChange: (filter: { min: number | null; max: number | null }) => void
  averageValueFilter: {
    min: number | null
    max: number | null
  }
  onAverageValueFilterChange: (filter: { min: number | null; max: number | null }) => void
  countyFilter: {
    selectedCounties: string[]
  }
  onCountyFilterChange: (filter: { selectedCounties: string[] }) => void
}

const STEP = 1
const MIN = 0
const MAX = 100

// Date range constants (common groundwater monitoring period)
const DATE_MIN = 1900
const DATE_MAX = new Date().getFullYear()

// Measurement value range constants (in feet below ground surface)
const VALUE_MIN = -50   // Above ground surface (artesian)
const VALUE_MAX = 500   // Deep groundwater wells

// Available filters configuration
const AVAILABLE_FILTERS = [
  { key: 'measurement', label: 'Measurement Count' },
  { key: 'date', label: 'Date Range' },
  { key: 'minMaxValue', label: 'Min/Max Depth' },
  { key: 'averageValue', label: 'Average Depth' },
  { key: 'county', label: 'Counties' },
]

// Sidebar Component
export function Sidebar({
  isOpen,
  onClose,
  measurementFilter,
  onMeasurementFilterChange,
  dateFilter,
  onDateFilterChange,
  minMaxValueFilter,
  onMinMaxValueFilterChange,
  averageValueFilter,
  onAverageValueFilterChange,
  countyFilter,
  onCountyFilterChange,
  filteredSiteCount,
  filteredSites
}: SidebarProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [localDateFilter, setLocalDateFilter] = useState<[number, number]>([dateFilter.startYear, dateFilter.endYear])
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  // Sync local date filter with props
  useEffect(() => {
    console.log('Sidebar: Syncing date filter with props')
    console.log('  - dateFilter prop:', dateFilter)
    console.log('  - localDateFilter state:', localDateFilter)
    setLocalDateFilter([dateFilter.startYear, dateFilter.endYear])
  }, [dateFilter.startYear, dateFilter.endYear])


  const handleExportCSV = () => {
    exportSitesData(filteredSites, 'groundwater_sites.csv')
  }

  const addFilter = (filterKey: string) => {
    if (!activeFilters.includes(filterKey)) {
      setActiveFilters(prev => [...prev, filterKey])
    }
  }

  const removeFilter = (filterKey: string) => {
    setActiveFilters(prev => prev.filter(f => f !== filterKey))
    
    // Reset filter values when removing
    switch (filterKey) {
      case 'date': {
        const resetDateFilter = { startYear: DATE_MIN, endYear: DATE_MAX }
        setLocalDateFilter([DATE_MIN, DATE_MAX])
        onDateFilterChange(resetDateFilter)
        break
      }
      case 'measurement':
        onMeasurementFilterChange({ min: MIN, max: null })
        break
      case 'minMaxValue':
        onMinMaxValueFilterChange({ min: null, max: null })
        break
      case 'averageValue':
        onAverageValueFilterChange({ min: null, max: null })
        break
      case 'county':
        onCountyFilterChange({ selectedCounties: [] })
        break
    }
  }

  // Check if filter has non-default values
  const isFilterActive = (filterKey: string): boolean => {
    switch (filterKey) {
      case 'measurement':
        return measurementFilter.min !== MIN || measurementFilter.max !== null
      case 'date':
        return dateFilter.startYear !== DATE_MIN || dateFilter.endYear !== DATE_MAX
      case 'minMaxValue':
        return minMaxValueFilter.min !== null || minMaxValueFilter.max !== null
      case 'averageValue':
        return averageValueFilter.min !== null || averageValueFilter.max !== null
      case 'county':
        return countyFilter.selectedCounties.length > 0
      default:
        return false
    }
  }


  const availableFiltersToAdd = AVAILABLE_FILTERS.filter(f => !activeFilters.includes(f.key))

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: isOpen ? '300px' : '0px',
      height: '100%',
      backgroundColor: '#34495e',
      transition: 'width 0.3s ease',
      overflow: 'hidden',
      boxShadow: isOpen ? '2px 0 4px rgba(0,0,0,0.1)' : 'none',
      zIndex: 100
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #2c3e50',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h3 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: '600' }}>
          Map Layers
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#bdc3c7',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '0' }}>
        <GroundwaterSection
          isExpanded={filtersExpanded}
          onToggleExpanded={() => setFiltersExpanded(!filtersExpanded)}
        >
          <AddFilterSelector
            availableFilters={availableFiltersToAdd}
            onAddFilter={addFilter}
          />
          <ActiveFiltersList
            activeFilters={activeFilters}
            availableFilters={AVAILABLE_FILTERS}
            filterValues={{
              measurementFilter,
              dateFilter,
              minMaxValueFilter,
              averageValueFilter,
              countyFilter,
              localDateFilter
            }}
            filterHandlers={{
              onMeasurementFilterChange,
              onDateFilterChange,
              onMinMaxValueFilterChange,
              onAverageValueFilterChange,
              onCountyFilterChange,
              setLocalDateFilter
            }}
            onRemoveFilter={removeFilter}
            constants={{
              MIN,
              MAX,
              DATE_MIN,
              DATE_MAX,
              VALUE_MIN,
              VALUE_MAX,
              STEP
            }}
          />
        </GroundwaterSection>

        <SiteCountDisplay
          measurementFilter={measurementFilter}
          dateFilter={dateFilter}
          filteredSiteCount={filteredSiteCount}
          isDateFilterActive={isFilterActive('date')}
        />

        <ExportButton onExport={handleExportCSV} />
      </div>
    </div>
  )
}