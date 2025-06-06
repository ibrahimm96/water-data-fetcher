/**
 * Formatting utilities for dates, numbers, and other data display
 */

/**
 * Format a date string for display
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format a datetime string for display
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Calculate and format data span between two dates
 */
export function getDataSpan(earliest: string | null | undefined, latest: string | null | undefined): string {
  if (!earliest || !latest) return 'N/A'
  const start = new Date(earliest)
  const end = new Date(latest)
  const diffTime = end.getTime() - start.getTime()
  const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365))
  if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''}`
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return `${diffDays} day${diffDays > 1 ? 's' : ''}`
}

/**
 * Format numbers with appropriate precision
 */
export function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return 'N/A'
  return value.toFixed(decimals)
}

/**
 * Format large numbers with appropriate units (K, M, B)
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B'
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M'
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K'
  return value.toString()
}