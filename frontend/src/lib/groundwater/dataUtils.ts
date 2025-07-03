import type { GroundwaterMonitoringSite } from './types'
import { getDataCache, type RawTimeSeriesData } from './dataCache'

/**
 * CENTRALIZED DATA MANAGEMENT SYSTEM
 * 
 * This module completely centralizes all data operations for the groundwater monitoring application.
 * It replaces scattered logic across components with a unified, efficient data management layer.
 */

// ================================
// CORE DATA INTERFACES
// ================================

export interface SiteMarkerStyle {
  color: string
  size: number
  strokeColor: string
  strokeWidth: number
}

export interface GeoJSONFeatureProperties {
  monitoring_location_id: string
  monitoring_location_name: string
  county_code: string | null
  state_code: string | null
  measurement_count: number
  marker_style?: SiteMarkerStyle
}

// Re-export cache interfaces for backward compatibility
export type { 
  RawTimeSeriesData, 
  ProcessedTimeSeriesData, 
  MeasurementFilter, 
  DateFilter,
  FilterState,
  FilterType
} from './dataCache'

export interface DataQuality {
  level: 'high' | 'medium' | 'low'
  color: string
  description: string
  badge: {
    backgroundColor: string
    textColor: string
    text: string
  }
}

export interface ExportOptions {
  filename?: string
  includeMetadata?: boolean
  dateFormat?: 'iso' | 'local' | 'short'
  includeQualifiers?: boolean
}

// ================================
// CENTRALIZED DATA OPERATIONS
// ================================

// Re-export cache accessor for backward compatibility
export { getDataCache } from './dataCache'

/**
 * Gets consistent marker styling based on measurement count
 */
export function getMarkerStyle(measurementCount: number): SiteMarkerStyle {
  if (measurementCount >= 10) {
    return {
      color: '#e74c3c',
      size: 10,
      strokeColor: '#ffffff',
      strokeWidth: 2
    }
  }
  if (measurementCount >= 3) {
    return {
      color: '#f39c12', 
      size: 8,
      strokeColor: '#ffffff',
      strokeWidth: 2
    }
  }
  return {
    color: '#3498db',
    size: 8,
    strokeColor: '#ffffff', 
    strokeWidth: 2
  }
}

/**
 * Gets comprehensive data quality indicator with enhanced styling
 */
export function getDataQuality(measurementCount: number): DataQuality {
  if (measurementCount >= 10) {
    return {
      level: 'high',
      color: '#27ae60',
      description: 'Rich historical data available',
      badge: {
        backgroundColor: '#27ae60',
        textColor: 'white',
        text: 'HIGH'
      }
    }
  }
  if (measurementCount >= 3) {
    return {
      level: 'medium', 
      color: '#f39c12',
      description: 'Moderate historical data available',
      badge: {
        backgroundColor: '#f39c12',
        textColor: 'white',
        text: 'MEDIUM'
      }
    }
  }
  return {
    level: 'low',
    color: '#95a5a6',
    description: 'Limited historical data available',
    badge: {
      backgroundColor: '#95a5a6',
      textColor: 'white',
      text: 'LOW'
    }
  }
}

/**
 * Formats dates consistently across the application
 */
export function formatDate(
  timestamp: number | string, 
  format: 'iso' | 'local' | 'short' = 'short'
): string {
  const date = new Date(timestamp)
  
  switch (format) {
    case 'iso':
      return date.toISOString()
    case 'local':
      return date.toLocaleString('en-US')
    case 'short':
    default:
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
  }
}

/**
 * Enhanced site popup content formatter
 */
export function formatSitePopupContent(
  siteName: string,
  siteId: string,
  measurementCount?: number,
  additionalInfo?: Record<string, string | number | null>
): string {
  const dataQuality = measurementCount ? getDataQuality(measurementCount) : null
  
  let content = `
    <div style="padding: 12px; font-size: 14px; min-width: 220px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px;">
        <strong style="color: #2c3e50; font-size: 15px;">${siteName}</strong>
        <div style="margin: 4px 0; color: #666; font-size: 12px;">ID: ${siteId}</div>
      </div>
  `
  
  if (measurementCount !== undefined && dataQuality) {
    content += `
      <div style="display: flex; align-items: center; gap: 8px; margin: 8px 0;">
        <span style="color: #666; font-size: 12px;">Measurements: ${measurementCount.toLocaleString()}</span>
        <span style="
          padding: 2px 6px; 
          background-color: ${dataQuality.badge.backgroundColor}; 
          color: ${dataQuality.badge.textColor}; 
          border-radius: 3px; 
          font-size: 10px; 
          font-weight: 500;
        ">${dataQuality.badge.text}</span>
      </div>
    `
  }

  if (additionalInfo) {
    Object.entries(additionalInfo).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        content += `
          <div style="margin: 4px 0; color: #666; font-size: 12px;">
            <strong>${key}:</strong> ${value}
          </div>
        `
      }
    })
  }

  return content + '</div>'
}

/**
 * Converts sites to enhanced GeoJSON with centralized caching
 */
export function sitesToEnhancedGeoJSON(sites?: GroundwaterMonitoringSite[]): GeoJSON.FeatureCollection {
  const sitesToProcess = sites || getDataCache().getFilteredSites()
  const validSites = sitesToProcess.filter(site => site.geometry?.type === 'Point')
  
  const features = validSites.map(site => {
    const measurementCount = site.measurement_count || 0
    const markerStyle = getMarkerStyle(measurementCount)
    
    return {
      type: 'Feature' as const,
      geometry: site.geometry as GeoJSON.Geometry,
      properties: {
        monitoring_location_id: site.monitoring_location_id || site.monitoring_location_number,
        monitoring_location_name: site.monitoring_location_name || 'Unnamed Site',
        county_code: site.county_code,
        state_code: site.state_code,
        measurement_count: measurementCount,
        marker_style: markerStyle,
        // Additional properties for enhanced functionality
        data_quality: getDataQuality(measurementCount),
        site_key: site.monitoring_location_id || site.monitoring_location_number
      } as GeoJSONFeatureProperties & {
        data_quality: DataQuality
        site_key: string
      }
    }
  })

  return {
    type: 'FeatureCollection',
    features
  }
}

// ================================
// CENTRALIZED EXPORT SYSTEM
// ================================

/**
 * Downloads CSV file with proper cleanup
 */
export function downloadCSV(
  csvContent: string,
  filename: string,
  contentType: string = "text/csv;charset=utf-8;"
): void {
  const blob = new Blob([csvContent], { type: contentType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.display = "none"
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generates CSV content from raw time-series data
 */
export function generateTimeSeriesCSV(
  rawData: RawTimeSeriesData[],
  options: ExportOptions = {}
): string {
  if (!rawData || rawData.length === 0) {
    throw new Error("No time-series data available for export")
  }

  const {
    includeMetadata = true,
    dateFormat = "iso",
    includeQualifiers = true
  } = options

  const baseHeaders = ["measurement_datetime", "measurement_value", "unit", "variable_name"]
  const headers = [...baseHeaders]

  if (includeQualifiers && rawData.some(row => row.qualifiers)) {
    headers.push("qualifiers")
  }

  if (includeMetadata) {
    const additionalFields = new Set<string>()
    rawData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (!baseHeaders.includes(key) && key !== "qualifiers") {
          additionalFields.add(key)
        }
      })
    })
    headers.push(...Array.from(additionalFields))
  }

  const rows = rawData.map(row => {
    const values: (string | number | null)[] = []
    
    values.push(
      formatDate(row.measurement_datetime, dateFormat),
      row.measurement_value,
      row.unit || "",
      row.variable_name || ""
    )

    if (includeQualifiers && headers.includes("qualifiers")) {
      values.push(row.qualifiers ? row.qualifiers.join(";") : "")
    }

    if (includeMetadata) {
      headers.slice(baseHeaders.length + (includeQualifiers ? 1 : 0)).forEach(header => {
        const value = row[header]
        values.push(value !== null && value !== undefined ? String(value) : "")
      })
    }

    return values.map(value => `"${String(value).replace(/"/g, "\"\"")}"`).join(",")
  })

  return [headers.join(","), ...rows].join("\n")
}

/**
 * Unified export function for time-series data using raw data
 */
export function exportTimeSeriesData(
  rawData: RawTimeSeriesData[],
  siteName?: string,
  siteId?: string,
  filename?: string,
  options: ExportOptions = {}
): void {
  const csvContent = generateTimeSeriesCSV(rawData, options)
  const safeSiteName = (siteName || siteId || "site").replace(/[^a-zA-Z0-9]/g, "_")
  const finalFilename = filename || 
    `${safeSiteName}_timeseries_${new Date().toISOString().split("T")[0]}.csv`
  
  downloadCSV(csvContent, finalFilename)
}

/**
 * Export sites data to CSV format
 */
export function exportSitesData(
  sites: GroundwaterMonitoringSite[],
  filename: string = 'groundwater_sites.csv'
): void {
  if (!sites || sites.length === 0) {
    console.warn('No sites data to export')
    return
  }

  const headers = [
    'monitoring_location_id',
    'monitoring_location_number', 
    'monitoring_location_name',
    'state_code',
    'county_code',
    'agency_code',
    'measurement_count',
    'latitude',
    'longitude',
    'data_quality'
  ]

  const rows = sites.map(site => {
    const lat = site.geometry && 'coordinates' in site.geometry ? site.geometry.coordinates?.[1] ?? '' : ''
    const lon = site.geometry && 'coordinates' in site.geometry ? site.geometry.coordinates?.[0] ?? '' : ''
    const measurementCount = site.measurement_count || 0
    const dataQuality = getDataQuality(measurementCount)

    return headers.map(key => {
      const value = key === 'latitude' ? lat :
                    key === 'longitude' ? lon :
                    key === 'data_quality' ? dataQuality.level :
                    site[key as keyof GroundwaterMonitoringSite] ?? ''
      return `"${String(value).replace(/"/g, '""')}"`
    }).join(',')
  })

  const csvContent = [headers.join(','), ...rows].join('\n')
  downloadCSV(csvContent, filename)
}
