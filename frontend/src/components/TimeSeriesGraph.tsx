import { useState, useRef, useEffect } from 'react'
import { LineChart } from '@mui/x-charts/LineChart'

interface TimeSeriesChartProps {
  siteId: string
  siteName: string
  isVisible: boolean
  onClose: () => void
  chartData: {
    data: Array<{ date: number; value: number; dateString: string }>
    unit: string | null
    variable_name: string | null
    dateRange: { start: string; end: string } | null
    totalPoints: number
  } | null
  isLoading: boolean
  error: string | null
}

export function TimeSeriesChart({ 
  siteId, 
  siteName, 
  isVisible, 
  onClose, 
  chartData, 
  isLoading, 
  error 
}: TimeSeriesChartProps) {
  const [position, setPosition] = useState({ x: 850, y: 300 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const chartRef = useRef<HTMLDivElement>(null)

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!chartRef.current) return
    
    const rect = chartRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    setIsDragging(true)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!isVisible) return null

  return (
    <div
      ref={chartRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '600px',
        height: '400px',
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        zIndex: 2000, // Above everything else
        display: 'flex',
        flexDirection: 'column',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Header - Draggable area */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #eee',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px 8px 0 0',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
      >
        <div>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: '#2c3e50'
          }}>
            Site Name: {siteName || 'Unnamed Site'}
          </h3>
          <div style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '2px'
          }}>
            Site ID: {siteId}
          </div>
        </div>
        
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#666',
            padding: '4px',
            borderRadius: '4px',
            lineHeight: '1'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f0f0f0'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          ×
        </button>
      </div>

      {/* Chart Content */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflow: 'hidden'
      }}>
        {isLoading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '16px'
            }}></div>
            <div style={{ color: '#666' }}>Loading time-series data...</div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#e74c3c'
          }}>
            <div style={{
              fontSize: '24px',
              marginBottom: '8px'
            }}>⚠️</div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Error Loading Data</div>
            <div style={{ fontSize: '14px', textAlign: 'center' }}>{error}</div>
          </div>
        )}

        {!isLoading && !error && chartData && (
          <div style={{ height: '100%' }}>
            {chartData.data.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#666'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
                <div>No time-series data available</div>
              </div>
            ) : (
              <>
                {/* Chart Info */}
                <div style={{
                  marginBottom: '16px',
                  padding: '8px 12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {chartData.variable_name || 'Groundwater Level'}
                  </div>
                  <div style={{ color: '#666' }}>
                    {chartData.totalPoints} measurements
                    {chartData.dateRange && (
                      <span> • {formatDate(new Date(chartData.dateRange.start).getTime())} to {formatDate(new Date(chartData.dateRange.end).getTime())}</span>
                    )}
                    {chartData.unit && <span> • {chartData.unit}</span>}
                  </div>
                </div>
                <LineChart
                  width={568}
                  height={250}
                  series={[
                    {
                      data: chartData.data.map(d => d.value),
                      area: true,
                      color: '#3498db'
                    }
                  ]}
                  xAxis={[{
                    data: chartData.data.map(d => new Date(d.date)),
                    scaleType: 'time',
                  }]}
                  yAxis={[{
                    label: chartData.unit || 'Value'
                  }]}
                  margin={{ left: 70, right: 20, top: 20, bottom: 60 }}
                />
               
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}