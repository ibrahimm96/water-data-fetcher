/**
 * Color system utilities for consistent data visualization
 */

export const dataColors = {
  excellent: '#10b981', // emerald-500 - High quality/recent data
  good: '#f59e0b',      // amber-500 - Moderate quality/older data
  poor: '#ef4444',      // red-500 - Low quality/very old data
  none: '#6b7280',      // gray-500 - Sites without recent measurements
} as const

export const statusColors = {
  success: '#22c55e',   // green-500
  warning: '#f97316',   // orange-500
  error: '#dc2626',     // red-600
  info: '#0ea5e9',      // sky-500
} as const

export const brandColors = {
  primary: '#0ea5e9',   // Electric Blue
  secondary: '#06b6d4', // Bright Cyan
  navy: '#0f172a',      // Deep Navy
} as const

/**
 * Get data quality color based on measurement count
 */
export function getDataQualityColor(measurementCount: number): string {
  if (measurementCount >= 10) return dataColors.excellent
  if (measurementCount >= 3) return dataColors.good
  if (measurementCount > 0) return dataColors.poor
  return dataColors.none
}

/**
 * Get data quality label based on measurement count
 */
export function getDataQualityLabel(measurementCount: number): string {
  if (measurementCount >= 10) return 'Excellent'
  if (measurementCount >= 3) return 'Good'
  if (measurementCount > 0) return 'Poor'
  return 'No Data'
}

/**
 * Get contrasting text color for a given background color
 */
export function getContrastingTextColor(backgroundColor: string): string {
  // Simple contrast calculation - in a real app you might use a more sophisticated algorithm
  const color = backgroundColor.replace('#', '')
  const r = parseInt(color.substr(0, 2), 16)
  const g = parseInt(color.substr(2, 2), 16)
  const b = parseInt(color.substr(4, 2), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128 ? '#000000' : '#ffffff'
}