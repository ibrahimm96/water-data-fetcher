import type { GroundwaterMonitoringSite } from './types'

/**
 * CENTRALIZED DATA CACHE SYSTEM
 * 
 * This module provides a singleton cache for managing groundwater monitoring site data
 * and time-series data with intelligent caching, filtering, and state management.
 */

// ================================
// CACHE INTERFACES
// ================================

export interface RawTimeSeriesData {
  measurement_datetime: string
  measurement_value: number
  unit: string | null
  variable_name: string | null
  variable_code?: string | null
  qualifiers?: string[] | null
  method_id?: number | null
  [key: string]: string | number | boolean | null | string[] | undefined // Allow additional database fields
}

export interface ProcessedTimeSeriesData {
  data: Array<{ date: number; value: number; dateString: string }>
  unit: string | null
  variable_name: string | null
  dateRange: { start: string; end: string } | null
  totalPoints: number
  rawData?: RawTimeSeriesData[]
}

export interface SiteWithTimeSeriesData extends GroundwaterMonitoringSite {
  timeSeriesData?: ProcessedTimeSeriesData
  lastFetched?: number
  isLoading?: boolean
  error?: string | null
  // date range information
  actualDateRange?: {
    startYear: number
    endYear: number
    firstMeasurement: string
    lastMeasurement: string
  }
}

// ================================
// DYNAMIC FILTER SYSTEM
// ================================

export interface MeasurementFilter {
  min: number
  max: number | null
}

export interface DateFilter {
  startYear: number
  endYear: number
}

export interface MinMaxValueFilter {
  min: number | null
  max: number | null
}

export interface AverageValueFilter {
  min: number | null
  max: number | null
}

export interface CountyFilter {
  selectedCounties: string[] // Array of county codes like ["001", "107", "036"]
}

export interface FilterState {
  measurement: MeasurementFilter
  date: DateFilter
  minMaxValue: MinMaxValueFilter
  averageValue: AverageValueFilter
  county: CountyFilter
  // Future filters can be added here
  // location?: LocationFilter
  // agency?: AgencyFilter
}

export type FilterType = keyof FilterState

// Union type for all possible filter values
export type FilterValue = MeasurementFilter | DateFilter | MinMaxValueFilter | AverageValueFilter | CountyFilter

export interface FilterConfig<T = FilterValue> {
  key: FilterType
  label: string
  defaultValue: T
  applyFilter: (site: GroundwaterMonitoringSite, filterValue: T) => boolean
}

// Default filter values
const DEFAULT_MEASUREMENT_FILTER: MeasurementFilter = { min: 0, max: null }
const DEFAULT_DATE_FILTER: DateFilter = { startYear: 1900, endYear: new Date().getFullYear() }
const DEFAULT_MIN_MAX_VALUE_FILTER: MinMaxValueFilter = { min: null, max: null }
const DEFAULT_AVERAGE_VALUE_FILTER: AverageValueFilter = { min: null, max: null }
const DEFAULT_COUNTY_FILTER: CountyFilter = { selectedCounties: [] }

// ================================
// CENTRALIZED DATA CACHE CLASS
// ================================

class DataCache {
  private static instance: DataCache
  private sites: Map<string, SiteWithTimeSeriesData> = new Map()
  private allSites: GroundwaterMonitoringSite[] = []
  private filteredSites: GroundwaterMonitoringSite[] = []
  private activeFilters: Partial<FilterState> = {}
  private timeSeriesCache: Map<string, { data: ProcessedTimeSeriesData; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private hasLoggedSample = false
  private hasLoggedDateFilter = false
  private hasLoggedMeasurementFilter = false

  // Filter configurations
  private filterConfigs: Map<FilterType, FilterConfig> = new Map([
    ['measurement', {
      key: 'measurement',
      label: 'Measurement Count',
      defaultValue: DEFAULT_MEASUREMENT_FILTER,
      applyFilter: (site, filter) => {
        const measurementFilter = filter as MeasurementFilter
        const count = site.measurement_count || 0
        const passes = count >= measurementFilter.min && (measurementFilter.max === null || count <= measurementFilter.max)
        
        // Debug logging for measurement filtering
        if (!this.hasLoggedMeasurementFilter && count > 0) {
          console.log('=== MEASUREMENT FILTER DEBUG ===')
          console.log('Site:', site.monitoring_location_name)
          console.log('Site measurement count:', count)
          console.log('Filter:', measurementFilter)
          console.log('Passes filter:', passes)
          console.log('Filter logic: count >= min && (max === null || count <= max)')
          console.log('  count >= min:', count >= measurementFilter.min)
          console.log('  max === null:', measurementFilter.max === null)
          console.log('  count <= max:', measurementFilter.max !== null ? count <= measurementFilter.max : 'N/A')
          console.log('=== END MEASUREMENT FILTER DEBUG ===')
          this.hasLoggedMeasurementFilter = true
        }
        
        return passes
      }
    }],
    ['date', {
      key: 'date',
      label: 'Date Range',
      defaultValue: DEFAULT_DATE_FILTER,
      applyFilter: (site, filter) => {
        const dateFilter = filter as DateFilter
        
        // If no measurement data, exclude from filtered results
        if (!site.measurement_count || site.measurement_count === 0) {
          return false
        }
        
        // Use the actualDateRange from the materialized view
        if (site.actualDateRange) {
          const actualStart = site.actualDateRange.startYear
          const actualEnd = site.actualDateRange.endYear
          
          // Check if the site's entire date range fits within the filter range
          const fitsWithin = actualStart >= dateFilter.startYear && actualEnd <= dateFilter.endYear
          
          // Debug logging for date filtering
          if (!this.hasLoggedDateFilter) {
            console.log('=== DATE FILTER DEBUG (MATERIALIZED VIEW) ===')
            console.log('Site:', site.monitoring_location_name)
            console.log('Site date range:', { actualStart, actualEnd })
            console.log('Filter date range:', { startYear: dateFilter.startYear, endYear: dateFilter.endYear })
            console.log('Fits within filter range:', fitsWithin)
            console.log('Filter logic: actualStart >= filterStart && actualEnd <= filterEnd')
            console.log('  actualStart >= filterStart:', actualStart >= dateFilter.startYear)
            console.log('  actualEnd <= filterEnd:', actualEnd <= dateFilter.endYear)
            console.log('=== END DATE FILTER DEBUG ===')
            this.hasLoggedDateFilter = true
          }
          
          return fitsWithin
        }
        
        // For sites without date range data in the materialized view, exclude them
        // This ensures precise filtering - we only show sites where we know the actual dates
        if (!this.hasLoggedDateFilter) {
          console.log('Excluding site without date range data:', site.monitoring_location_name)
        }
        return false
      }
    }],
    ['minMaxValue', {
      key: 'minMaxValue',
      label: 'Min/Max Measurement Value',
      defaultValue: DEFAULT_MIN_MAX_VALUE_FILTER,
      applyFilter: (site, filter) => {
        const valueFilter = filter as MinMaxValueFilter
        const minValue = site.min_value
        const maxValue = site.max_value
        
        // If site has no measurement values, exclude it
        if ((minValue === null || minValue === undefined) && (maxValue === null || maxValue === undefined)) {
          return false
        }
        
        // Apply min filter
        if (valueFilter.min !== null) {
          if (minValue === null || minValue === undefined || minValue < valueFilter.min) {
            return false
          }
        }
        
        // Apply max filter
        if (valueFilter.max !== null) {
          if (maxValue === null || maxValue === undefined || maxValue > valueFilter.max) {
            return false
          }
        }
        
        return true
      }
    }],
    ['averageValue', {
      key: 'averageValue',
      label: 'Average Measurement Value',
      defaultValue: DEFAULT_AVERAGE_VALUE_FILTER,
      applyFilter: (site, filter) => {
        const valueFilter = filter as AverageValueFilter
        const avgValue = site.avg_value
        
        // If site has no average value, exclude it
        if (avgValue === null || avgValue === undefined) {
          return false
        }
        
        // Apply min filter
        if (valueFilter.min !== null && avgValue !== null && avgValue !== undefined && avgValue < valueFilter.min) {
          return false
        }
        
        // Apply max filter
        if (valueFilter.max !== null && avgValue !== null && avgValue !== undefined && avgValue > valueFilter.max) {
          return false
        }
        
        return true
      }
    }],
    ['county', {
      key: 'county',
      label: 'County Filter',
      defaultValue: DEFAULT_COUNTY_FILTER,
      applyFilter: (site, filter) => {
        const countyFilter = filter as CountyFilter
        
        // If no counties are selected, show all sites
        if (countyFilter.selectedCounties.length === 0) {
          return true
        }
        
        // If site has no county code, exclude it when filter is active
        if (!site.county_code) {
          return false
        }
        
        // Check if site's county code is in the selected counties
        return countyFilter.selectedCounties.includes(site.county_code)
      }
    }]
  ])

  static getInstance(): DataCache {
    if (!DataCache.instance) {
      DataCache.instance = new DataCache()
    }
    return DataCache.instance
  }

  // Sites Management
  setSites(sites: GroundwaterMonitoringSite[]): void {
    this.allSites = sites
    sites.forEach(site => {
      const key = site.monitoring_location_id || site.monitoring_location_number
      if (key) {
        this.sites.set(key, { ...site })
      }
    })
    this.applyAllFilters()
  }

  getAllSites(): GroundwaterMonitoringSite[] {
    return [...this.allSites]
  }

  getFilteredSites(): GroundwaterMonitoringSite[] {
    return [...this.filteredSites]
  }

  getSite(siteId: string): SiteWithTimeSeriesData | undefined {
    return this.sites.get(siteId)
  }

  // Dynamic Filtering System
  setFilter<T extends FilterType>(filterType: T, filterValue: FilterState[T]): void {
    console.log(`=== SETTING FILTER: ${filterType} ===`)
    console.log('New filter value:', filterValue)
    console.log('Previous filters:', this.activeFilters)
    
    this.activeFilters[filterType] = filterValue
    
    console.log('Updated filters:', this.activeFilters)
    console.log('About to apply filters...')
    
    this.applyAllFilters()
  }

  getFilter<T extends FilterType>(filterType: T): FilterState[T] | undefined {
    return this.activeFilters[filterType]
  }

  getAllFilters(): Partial<FilterState> {
    return { ...this.activeFilters }
  }

  removeFilter(filterType: FilterType): void {
    delete this.activeFilters[filterType]
    this.applyAllFilters()
  }

  clearAllFilters(): void {
    this.activeFilters = {}
    this.applyAllFilters()
  }

  getFilterConfig(filterType: FilterType): FilterConfig | undefined {
    return this.filterConfigs.get(filterType)
  }

  getAllFilterConfigs(): FilterConfig[] {
    return Array.from(this.filterConfigs.values())
  }

  private applyAllFilters(): void {
    console.log('=== APPLYING ALL FILTERS ===')
    console.log('Total sites:', this.allSites.length)
    console.log('Active filters:', this.activeFilters)
    
    // Sample a few sites to see their measurement counts and date ranges
    const sampleSites = this.allSites.slice(0, 5).map(site => ({
      name: site.monitoring_location_name,
      count: site.measurement_count,
      dateRange: site.actualDateRange ? `${site.actualDateRange.startYear}-${site.actualDateRange.endYear}` : 'No dates'
    }))
    console.log('Sample sites:', sampleSites)
    
    let passedMeasurement = 0
    let passedDate = 0
    let passedBothFilters = 0
    let totalPassed = 0
    
    this.filteredSites = this.allSites.filter(site => {
      let measurementPassed = true
      let datePassed = true
      let overallPassed = true
      
      // Apply all active filters
      for (const [filterType, filterValue] of Object.entries(this.activeFilters)) {
        const config = this.filterConfigs.get(filterType as FilterType)
        if (config) {
          const filterPasses = config.applyFilter(site, filterValue)
          if (!filterPasses) {
            overallPassed = false
          }
          
          // Track individual filter results
          if (filterType === 'measurement') {
            measurementPassed = filterPasses
            if (filterPasses) passedMeasurement++
          }
          if (filterType === 'date') {
            datePassed = filterPasses
            if (filterPasses) passedDate++
          }
        }
      }
      
      // Count sites that pass both filters
      if (measurementPassed && datePassed) {
        passedBothFilters++
      }
      
      if (overallPassed) totalPassed++
      return overallPassed
    })
    
    console.log('Filter results:')
    console.log('  - Passed measurement filter:', passedMeasurement)
    console.log('  - Passed date filter:', passedDate)
    console.log('  - Passed BOTH filters:', passedBothFilters)
    console.log('  - Total passed all filters:', totalPassed)
    console.log('  - Final filtered sites:', this.filteredSites.length)
    console.log('=== END APPLYING FILTERS ===')
  }

  // Legacy methods for backward compatibility
  /** @deprecated Use setFilter('measurement', filter) instead */
  setMeasurementFilter(filter: MeasurementFilter): void {
    this.setFilter('measurement', filter)
  }

  /** @deprecated Use getFilter('measurement') instead */
  getMeasurementFilter(): MeasurementFilter {
    return this.getFilter('measurement') || DEFAULT_MEASUREMENT_FILTER
  }

  // New date filter methods
  setDateFilter(filter: DateFilter): void {
    this.setFilter('date', filter)
  }

  getDateFilter(): DateFilter {
    return this.getFilter('date') || DEFAULT_DATE_FILTER
  }

  // Enhanced date range management
  updateSiteWithActualDateRange(siteId: string, dateRange: { start: string; end: string }): void {
    const site = this.sites.get(siteId)
    if (site) {
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)
      
      site.actualDateRange = {
        startYear: startDate.getFullYear(),
        endYear: endDate.getFullYear(),
        firstMeasurement: dateRange.start,
        lastMeasurement: dateRange.end
      }
      
      // Re-apply filters since we have better date information now
      this.applyAllFilters()
    }
  }

  getSiteActualDateRange(siteId: string): { startYear: number; endYear: number } | null {
    const site = this.sites.get(siteId)
    if (site && (site as SiteWithTimeSeriesData).actualDateRange) {
      const range = (site as SiteWithTimeSeriesData).actualDateRange!
      return {
        startYear: range.startYear,
        endYear: range.endYear
      }
    }
    return null
  }

  // Time Series Cache Management
  getTimeSeriesData(siteId: string): ProcessedTimeSeriesData | null {
    const cached = this.timeSeriesCache.get(siteId)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }
    return null
  }

  setTimeSeriesData(siteId: string, data: ProcessedTimeSeriesData): void {
    // Only cache if data is valid
    if (data && data.data && Array.isArray(data.data)) {
      this.timeSeriesCache.set(siteId, {
        data,
        timestamp: Date.now()
      })
      
      // Update site with cached data and extract date range
      const site = this.sites.get(siteId)
      if (site) {
        site.timeSeriesData = data
        site.lastFetched = Date.now()
        site.isLoading = false
        site.error = null
        
        // Extract actual date range from time series data
        if (data.dateRange) {
          const startDate = new Date(data.dateRange.start)
          const endDate = new Date(data.dateRange.end)
          
          site.actualDateRange = {
            startYear: startDate.getFullYear(),
            endYear: endDate.getFullYear(),
            firstMeasurement: data.dateRange.start,
            lastMeasurement: data.dateRange.end
          }
        }
        
        // Console log a single instance of Site with Time Series Data
        // Log once per cache instance to avoid spam
        if (!this.hasLoggedSample) {
          console.log('=== DATACACHE DEBUG: Site with Time Series Data ===')
          console.log('Site ID:', siteId)
          console.log('Site Object:', site)
          console.log('Site Attributes:')
          console.log('  - monitoring_location_id:', site.monitoring_location_id)
          console.log('  - monitoring_location_number:', site.monitoring_location_number)
          console.log('  - monitoring_location_name:', site.monitoring_location_name)
          console.log('  - measurement_count:', site.measurement_count)
          console.log('  - geometry:', site.geometry)
          console.log('  - altitude:', site.altitude)
          console.log('  - timeSeriesData:', site.timeSeriesData)
          console.log('  - actualDateRange:', site.actualDateRange)
          console.log('  - lastFetched:', site.lastFetched)
          console.log('  - isLoading:', site.isLoading)
          console.log('  - error:', site.error)
          console.log('Time Series Data Object:', data)
          console.log('Time Series Data Attributes:')
          console.log('  - data.length:', data.data.length)
          console.log('  - unit:', data.unit)
          console.log('  - variable_name:', data.variable_name)
          console.log('  - dateRange:', data.dateRange)
          console.log('  - totalPoints:', data.totalPoints)
          console.log('  - rawData.length:', data.rawData?.length || 'No rawData')
          console.log('  - First 3 data points:', data.data.slice(0, 3))
          if (data.rawData && data.rawData.length > 0) {
            console.log('  - First raw data point:', data.rawData[0])
            console.log('  - All raw data attributes:', Object.keys(data.rawData[0]))
          }
          console.log('=== END DATACACHE DEBUG ===')
          
          // Mark as logged to avoid spam
          this.hasLoggedSample = true
        }
      }
    }
  }

  setSiteLoading(siteId: string, loading: boolean, error?: string | null): void {
    const site = this.sites.get(siteId)
    if (site) {
      site.isLoading = loading
      site.error = error || null
    }
  }

  // Cache Management
  clearCache(): void {
    this.timeSeriesCache.clear()
    this.sites.forEach(site => {
      site.timeSeriesData = undefined
      site.lastFetched = undefined
      site.isLoading = false
      site.error = null
    })
  }

  clearExpiredCache(): void {
    const now = Date.now()
    for (const [siteId, cached] of this.timeSeriesCache.entries()) {
      if (now - cached.timestamp >= this.CACHE_TTL) {
        this.timeSeriesCache.delete(siteId)
        const site = this.sites.get(siteId)
        if (site) {
          site.timeSeriesData = undefined
          site.lastFetched = undefined
        }
      }
    }
  }

}

// ================================
// CACHE ACCESSOR FUNCTION
// ================================

/**
 * Gets the singleton data cache instance
 */
export function getDataCache(): DataCache {
  return DataCache.getInstance()
}

/**
 * Export the DataCache class for direct usage if needed
 */
export { DataCache }

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Creates a new filter configuration for easy extension
 */
export function createFilterConfig<T extends FilterValue>(
  key: string,
  label: string,
  defaultValue: T,
  applyFilter: (site: GroundwaterMonitoringSite, filterValue: FilterValue) => boolean
): FilterConfig<FilterValue> {
  return {
    key: key as FilterType,
    label,
    defaultValue,
    applyFilter
  }
}

/**
 * Helper function to easily add new filters to the system
 * Usage: addFilterType('agency', 'Agency Code', defaultAgencyFilter, agencyFilterFunction)
 * Note: Currently requires manual extension of FilterState interface
 */
export function addFilterType(
  cache: DataCache,
  config: FilterConfig<FilterValue>
): void {
  // This would extend the filter system dynamically
  // Implementation would require extending the FilterState interface
  console.warn('Dynamic filter type addition requires extending FilterState interface', { cache, config })
}

// Export filter defaults for external use
export { DEFAULT_MEASUREMENT_FILTER, DEFAULT_DATE_FILTER, DEFAULT_MIN_MAX_VALUE_FILTER, DEFAULT_AVERAGE_VALUE_FILTER, DEFAULT_COUNTY_FILTER }