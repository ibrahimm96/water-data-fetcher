import type { GroundwaterMonitoringSite } from './types'

/**
 * Centralized utilities for data processing - works alongside existing logic
 * These functions extend current functionality without breaking existing code
 */

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

/**
 * Enhances existing GeoJSON features with consistent styling
 */
export function enhanceGeoJSONFeatures(
  features: GeoJSON.Feature[]
): GeoJSON.Feature<GeoJSON.Geometry, GeoJSONFeatureProperties>[] {
  return features.map(feature => ({
    ...feature,
    properties: {
      ...feature.properties,
      marker_style: getMarkerStyle(feature.properties?.measurement_count || 0)
    } as GeoJSONFeatureProperties
  }))
}

/**
 * Gets consistent marker styling based on measurement count
 * Matches existing color logic from MapView
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
 * Formats site information for popups - centralizes popup content logic
 */
export function formatSitePopupContent(
  siteName: string,
  siteId: string,
  measurementCount?: number,
  additionalInfo?: Record<string, string | number | null>
): string {
  const baseContent = `
    <div style="padding: 10px; font-size: 14px; min-width: 200px;">
      <strong style="color: #2c3e50;">${siteName}</strong><br/>
      <div style="margin: 4px 0; color: #666; font-size: 12px;">
        Site ID: ${siteId}
      </div>
  `
  
  let additionalContent = ''
  
  if (measurementCount !== undefined) {
    const dataQuality = measurementCount >= 10 ? 'High' : measurementCount >= 3 ? 'Medium' : 'Low'
    additionalContent += `
      <div style="margin: 4px 0; color: #666; font-size: 12px;">
        Measurements: ${measurementCount} (${dataQuality} data volume)
      </div>
    `
  }

  if (additionalInfo) {
    Object.entries(additionalInfo).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        additionalContent += `
          <div style="margin: 4px 0; color: #666; font-size: 12px;">
            ${key}: ${value}
          </div>
        `
      }
    })
  }

  return baseContent + additionalContent + '</div>'
}

/**
 * Converts sites to enhanced GeoJSON with consistent styling
 * Extends existing geojsonData logic from MapView
 */
export function sitesToEnhancedGeoJSON(sites: GroundwaterMonitoringSite[]): GeoJSON.FeatureCollection {
  const validSites = sites.filter(site => site.geometry?.type === 'Point')
  
  const features = validSites.map(site => ({
    type: 'Feature' as const,
    geometry: site.geometry as GeoJSON.Geometry,
    properties: {
      monitoring_location_id: site.monitoring_location_id || site.monitoring_location_number,
      monitoring_location_name: site.monitoring_location_name || 'Unnamed Site',
      county_code: site.county_code,
      state_code: site.state_code,
      measurement_count: site.measurement_count || 0,
      marker_style: getMarkerStyle(site.measurement_count || 0)
    } as GeoJSONFeatureProperties
  }))

  return {
    type: 'FeatureCollection',
    features: enhanceGeoJSONFeatures(features)
  }
}

/**
 * Formats chart data for consistent display across components
 * Works with existing chartData structure from ChartTabContent
 */
export interface FormattedChartData {
  title: string
  subtitle: string
  data: Array<{ date: number; value: number; dateString: string }>
  unit: string | null
  dateRange: { start: string; end: string } | null
  totalPoints: number
  variable_name: string | null
}

export function formatChartData(
  chartData: {
    data: Array<{ date: number; value: number; dateString: string }>
    unit: string | null
    variable_name: string | null
    dateRange: { start: string; end: string } | null
    totalPoints: number
  },
  siteName: string,
  siteId: string
): FormattedChartData {
  return {
    title: siteName || 'Unnamed Site',
    subtitle: `Site ID: ${siteId}`,
    data: chartData.data,
    unit: chartData.unit,
    dateRange: chartData.dateRange,
    totalPoints: chartData.totalPoints,
    variable_name: chartData.variable_name
  }
}

/**
 * Utility to format dates consistently across components
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Gets data quality indicator based on measurement count
 */
export function getDataQuality(measurementCount: number): {
  level: 'high' | 'medium' | 'low'
  color: string
  description: string
} {
  if (measurementCount >= 10) {
    return {
      level: 'high',
      color: '#27ae60',
      description: 'Rich historical data available'
    }
  }
  if (measurementCount >= 3) {
    return {
      level: 'medium', 
      color: '#f39c12',
      description: 'Moderate historical data available'
    }
  }
  return {
    level: 'low',
    color: '#95a5a6',
    description: 'Limited historical data available'
  }
}