import type { GroundwaterMonitoringSite } from '../lib/groundwater/types'

type SiteWithCount = GroundwaterMonitoringSite & {
  measurement_count?: number
}

interface ExportCSVButtonProps {
  data: SiteWithCount[]
  filename?: string
}

export function ExportCSVButton({ data, filename = 'groundwater_sites.csv' }: ExportCSVButtonProps) {
  if (!data || data.length === 0) return null

  const headers = [
    'monitoring_location_id',
    'monitoring_location_number',
    'monitoring_location_name',
    'state_code',
    'county_code',
    'agency_code',
    'measurement_count',
    'latitude',
    'longitude'
  ]

  const convertToCSV = (sites: SiteWithCount[]) => {
    const rows = sites.map(site => {
      const lat = site.geometry && 'coordinates' in site.geometry ? site.geometry.coordinates?.[1] ?? '' : ''
      const lon = site.geometry && 'coordinates' in site.geometry ? site.geometry.coordinates?.[0] ?? '' : ''

      return headers.map(key => {
        const value = key === 'latitude' ? lat :
                      key === 'longitude' ? lon :
                      site[key as keyof SiteWithCount] ?? ''
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    })

    return [headers.join(','), ...rows].join('\n')
  }

  const downloadCSV = () => {
    const csvContent = convertToCSV(data)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <button
      onClick={downloadCSV}
      style={{
        padding: '8px 12px',
        backgroundColor: '#ff5722',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '14px'
      }}
    >
      Export as CSV
    </button>
  )
}
