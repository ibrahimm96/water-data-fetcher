import Draggable from 'react-draggable'
import { useState, useRef } from 'react'
import { ChartTabContent } from './ChartTab'
import { DataTable } from './DataTable'
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
  const [activeTab, setActiveTab] = useState<'chart' | 'statistics' | 'table'>('chart')
  const [size] = useState({ width: 600, height: 400 })

  const nodeRef = useRef<HTMLDivElement>(null!)

  if (!isVisible) return null

  return (
    <Draggable handle=".panel-header" nodeRef={nodeRef}>
      <div
        ref={nodeRef}
        style={{
          position: 'fixed',
          width: `${size.width}px`,
          height: `${size.height}px`,
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          className="panel-header"
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
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
          {['chart', 'statistics', 'table'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: activeTab === tab ? '#ecf0f1' : 'white',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #3498db' : 'none',
                fontWeight: activeTab === tab ? '600' : '400',
                cursor: 'pointer'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
          {activeTab === 'chart' && (
            <ChartTabContent isLoading={isLoading} error={error} chartData={chartData} />
          )}
          {activeTab === 'statistics' && (
            <StatisticsTabContent siteId={siteId} chartData={chartData} />
          )}
          {activeTab === 'table' && chartData?.data?.length ? (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <DataTable data={chartData.data} unit={chartData.unit} />
            </div>
          ) : null}
        </div>
      </div>
    </Draggable>
  )
}
