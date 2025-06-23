import { useRef, useEffect, useState } from 'react'
import { LineChart } from '@mui/x-charts/LineChart'

export interface ChartTabContentProps {
  isLoading: boolean
  error: string | null
  chartData: {
    data: Array<{ date: number; value: number; dateString: string }>
    unit: string | null
    variable_name: string | null
    dateRange: { start: string; end: string } | null
    totalPoints: number
  } | null
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function ChartTabContent({ isLoading, error, chartData }: ChartTabContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 500, height: 250 })

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setDimensions({
        width: Math.max(300, Math.floor(width)),
        height: Math.max(200, Math.floor(height) - 90) // reserve height for header
      })
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#e74c3c' }}>
        <div>⚠️ Error: {error}</div>
      </div>
    )
  }

  if (!chartData || chartData.data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
        No time-series data available
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '8px 12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        fontSize: '14px',
        flexShrink: 0,
        marginBottom: '12px'
      }}>
        <div style={{ fontWeight: 600 }}>{chartData.variable_name || 'Groundwater Level'}</div>
        <div style={{ color: '#666' }}>
          {chartData.totalPoints} measurements
          {chartData.dateRange && (
            <span> • {formatDate(new Date(chartData.dateRange.start).getTime())} to {formatDate(new Date(chartData.dateRange.end).getTime())}</span>
          )}
          {chartData.unit && <span> • {chartData.unit}</span>}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <LineChart
          width={dimensions.width}
          height={dimensions.height}
          series={[{ data: chartData.data.map(d => d.value), area: true, color: '#3498db' }]}
          xAxis={[{ data: chartData.data.map(d => new Date(d.date)), scaleType: 'time' }]}
          yAxis={[{ label: 'Depth To Water Level (ft)', scaleType: 'linear', min: 0 }]}
          margin={{ left: 20, right: 20, top: 20, bottom: 0 }}
        />
      </div>
    </div>
  )
}
