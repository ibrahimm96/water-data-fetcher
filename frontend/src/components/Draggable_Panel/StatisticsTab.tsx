import type { ChartTabContentProps } from './ChartTab'
import { DataTable } from './DataTable'

type StatisticsTabContentProps = {
  siteId: string
  chartData: ChartTabContentProps['chartData']
}

export function StatisticsTabContent({ siteId, chartData }: StatisticsTabContentProps) {
  if (!chartData || chartData.data.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#aaa'
      }}>
        No statistics available for this site.
      </div>
    )
  }

  const values = chartData.data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length

  const firstDate = new Date(chartData.data[0].dateString)
  const lastPoint = chartData.data[chartData.data.length - 1]
  const lastDate = new Date(lastPoint.dateString)
  const dataSpanDays = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))

  function Stat({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>{label}</span>
        <span style={{ fontWeight: 500 }}>
          {value} {suffix || ''}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontSize: '13px',
      color: '#2c3e50'
    }}>
      {/* Most Recent Measurement */}
      <div style={{ textAlign: 'center', padding: '12px 16px 0 16px' }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#3498db',
          lineHeight: '1.2'
        }}>
          {lastPoint.value.toFixed(2)} {chartData.unit || ''}
        </div>
        <div style={{
          fontSize: '12px',
          color: '#666',
          marginTop: '2px'
        }}>
          Measured on {new Date(lastPoint.dateString).toLocaleDateString()}
        </div>
      </div>

      {/* Scrollable Content */}
    <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', height: '100%' }}>
  {/* Left column: Stats */}
  <div style={{ flex: 1, overflowY: 'auto' }}>
    <div style={{ fontWeight: '600', fontSize: '13.5px', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '12px' }}>
      Statistics for Site {siteId}
    </div>
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      rowGap: '8px',
      columnGap: '16px',
      lineHeight: '1.4'
    }}>
      <Stat label="Total Measurements" value={chartData.totalPoints.toLocaleString()} />
      <Stat label="Data Span" value={`${dataSpanDays} days`} />
      <Stat label="First Measurement" value={firstDate.toLocaleDateString()} />
      <Stat label="Last Measurement" value={lastDate.toLocaleDateString()} />
      <Stat label="Min Value" value={min.toFixed(2)} suffix={chartData.unit || undefined} />
      <Stat label="Max Value" value={max.toFixed(2)} suffix={chartData.unit || undefined} />
      <Stat label="Avg Value" value={avg.toFixed(2)} suffix={chartData.unit || undefined} />
      <Stat label="Variable" value={chartData.variable_name || 'N/A'} />
      <Stat label="Unit" value={chartData.unit || 'N/A'} />
    </div>
  </div>

  {/* Right column: Data table */}
  <div style={{ flex: 1, overflowY: 'auto' }}>
    <DataTable data={chartData.data} unit={chartData.unit} />
    </div>
    </div>
    </div>
  )
}
