import type { Key } from 'react'
import { formatDate, getDataQuality, exportTimeSeriesData, downloadCSV } from '../../lib/groundwater/dataUtils'
import type { DraggablePanelTabProps } from './types'

export function DataTable({ data }: DraggablePanelTabProps) {
  const { siteId, siteName, chartData } = data
  
  if (!chartData?.data) return null
  
  const tableData = chartData.data
  const unit = chartData.unit
  const rawData = chartData.rawData
  const dataQuality = getDataQuality(tableData.length)
  
  const downloadTimeSeriesCSV = () => {
    if (rawData && rawData.length > 0) {
      // Use centralized export with original raw data from database
      exportTimeSeriesData(rawData, siteName, siteId, undefined, {
        includeMetadata: true,
        includeQualifiers: true,
        dateFormat: 'iso'
      })
      return
    }
    
    // Fallback to processed data if raw data not available
    const headers = ['Date', `Value${unit ? ` (${unit})` : ''}`]
    const csvRows = tableData.map(row => [
      formatDate(new Date(row.date).getTime()),
      row.value.toFixed(2)
    ])
    
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const filename = `${siteName || siteId || 'site'}_timeseries_data.csv`
    downloadCSV(csvContent, filename)
  }
  
  return (
    <div style={{ maxHeight: '100%', overflowY: 'auto' }}>
      <div style={{
        fontWeight: '600',
        fontSize: '13.5px',
        marginBottom: '8px',
        borderBottom: '1px solid #ddd',
        paddingBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Measurement Table ({tableData.length.toLocaleString()} records)</span>
          <span style={{
            padding: '2px 6px',
            backgroundColor: dataQuality.color,
            color: 'white',
            borderRadius: '3px',
            fontSize: '10px',
            fontWeight: '500'
          }}>
            {dataQuality.level.toUpperCase()}
          </span>
        </div>
        <button
          onClick={downloadTimeSeriesCSV}
          style={{
            padding: '4px 8px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '11px'
          }}
        >
          Download CSV
        </button>
      </div>
      <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
            <th style={{ padding: '4px 8px' }}>Date</th>
            <th style={{ padding: '4px 8px' }}>Value {unit ? `(${unit})` : ''}</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row: { date: string | number | Date; value: number }, idx: Key | null | undefined) => (
            <tr key={idx}>
              <td style={{ padding: '4px 8px', color: '#2c3e50' }}>{formatDate(new Date(row.date).getTime())}</td>
              <td style={{ padding: '4px 8px', color: '#2c3e50' }}>{row.value.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
