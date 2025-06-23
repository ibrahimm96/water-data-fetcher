import { useState, useRef, useEffect } from 'react'
import { ChartTabContent } from './ChartTab'
import { StatisticsTabContent } from './StatisticsTab'
import type { ChartTabContentProps } from './ChartTab'

interface DraggablePanelProps {
  siteId: string
  siteName: string
  isVisible: boolean
  onClose: () => void
  chartData: ChartTabContentProps['chartData']
  isLoading: boolean
  error: string | null
}

export function DraggablePanel({
  siteId,
  siteName,
  isVisible,
  onClose,
  chartData,
  isLoading,
  error
}: DraggablePanelProps) {
  const [activeTab, setActiveTab] = useState<'chart' | 'statistics'>('chart')
  const [position, setPosition] = useState({ x: 850, y: 300 })
  const [size, setSize] = useState({ width: 600, height: 400 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  const MIN_WIDTH = 400
  const MAX_WIDTH = 800
  const MIN_HEIGHT = 300
  const MAX_HEIGHT = 600

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setIsDragging(true)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y })
  }

  const handleMouseUp = () => setIsDragging(false)

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

  if (!isVisible) return null

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Header */}
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
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
            Site Name: {siteName || 'Unnamed Site'}
          </h3>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
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
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('chart')}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: activeTab === 'chart' ? '#ecf0f1' : 'white',
            border: 'none',
            borderBottom: activeTab === 'chart' ? '2px solid #3498db' : 'none',
            fontWeight: activeTab === 'chart' ? '600' : '400',
            cursor: 'pointer'
          }}
        >
          Chart
        </button>
        <button
          onClick={() => setActiveTab('statistics')}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: activeTab === 'statistics' ? '#ecf0f1' : 'white',
            border: 'none',
            borderBottom: activeTab === 'statistics' ? '2px solid #3498db' : 'none',
            fontWeight: activeTab === 'statistics' ? '600' : '400',
            cursor: 'pointer'
          }}
        >
          Statistics
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
        {activeTab === 'chart' ? (
          <ChartTabContent isLoading={isLoading} error={error} chartData={chartData} />
        ) : (
          <StatisticsTabContent siteId={siteId} chartData={chartData} />
        )}
      </div>

      {/* Resize Handles (8 directions) */}
      {[
        { cursor: 'nwse-resize', style: { bottom: 0, right: 0 }, dx: 1, dy: 1 },
        { cursor: 'nesw-resize', style: { bottom: 0, left: 0 }, dx: -1, dy: 1 },
        { cursor: 'nesw-resize', style: { top: 0, right: 0 }, dx: 1, dy: -1 },
        { cursor: 'nwse-resize', style: { top: 0, left: 0 }, dx: -1, dy: -1 },
        { cursor: 'ns-resize', style: { top: 0, left: '50%' }, dx: 0, dy: -1 },
        { cursor: 'ns-resize', style: { bottom: 0, left: '50%' }, dx: 0, dy: 1 },
        { cursor: 'ew-resize', style: { top: '50%', left: 0 }, dx: -1, dy: 0 },
        { cursor: 'ew-resize', style: { top: '50%', right: 0 }, dx: 1, dy: 0 }
      ].map(({ cursor, style, dx, dy }, i) => (
        <div
          key={i}
          onMouseDown={(e) => {
            e.stopPropagation()
            const startX = e.clientX
            const startY = e.clientY
            const startWidth = size.width
            const startHeight = size.height
            const startPos = { ...position }

            const onMouseMove = (e: MouseEvent) => {
              const deltaX = e.clientX - startX
              const deltaY = e.clientY - startY

              const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + deltaX * dx))
              const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + deltaY * dy))

              setSize({ width: newWidth, height: newHeight })

              if (dx < 0) setPosition(pos => ({ ...pos, x: startPos.x + deltaX }))
              if (dy < 0) setPosition(pos => ({ ...pos, y: startPos.y + deltaY }))
            }

            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove)
              document.removeEventListener('mouseup', onMouseUp)
            }

            document.addEventListener('mousemove', onMouseMove)
            document.addEventListener('mouseup', onMouseUp)
          }}
          style={{
            position: 'absolute',
            width: '12px',
            height: '12px',
            backgroundColor: 'transparent',
            zIndex: 10,
            cursor,
            transform: 'translate(-50%, -50%)',
            ...style
          }}
        />
      ))}
    </div>
  )
}
