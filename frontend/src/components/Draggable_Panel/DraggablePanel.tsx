import Draggable from 'react-draggable'
import { useState, useRef } from 'react'
import { ChartTabContent } from './ChartTab'
import { DataTable } from './DataTable'
import { StatisticsTabContent } from './StatisticsTab'
import type { DraggablePanelData, ActiveTab } from './types'
import { getDataQuality, getDataCache } from '../../lib/groundwater/dataUtils'

export function DraggablePanel(data: DraggablePanelData) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chart')
  const [size] = useState({ width: 600, height: 400 })

  const nodeRef = useRef<HTMLDivElement>(null!)

  // Use centralized data formatting and caching
  const cache = getDataCache()
  const dataQuality = data.chartData ? getDataQuality(data.chartData.totalPoints) : null
  
  // Cache the data for future access
  if (data.chartData) {
    cache.setTimeSeriesData(data.siteId, data.chartData)
  }

  if (!data.isVisible) return null

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
              Site Name: {data.siteName || 'Unnamed Site'}
            </h3>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
              Site ID: {data.siteId}
              {dataQuality && (
                <span style={{ 
                  marginLeft: '8px', 
                  padding: '2px 6px', 
                  backgroundColor: dataQuality.color, 
                  color: 'white', 
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: '500'
                }}>
                  {dataQuality.level.toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={data.onClose}
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
            <ChartTabContent data={data} />
          )}
          {activeTab === 'statistics' && (
            <StatisticsTabContent data={data} />
          )}
          {activeTab === 'table' && data.chartData?.data?.length ? (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <DataTable data={data} />
            </div>
          ) : null}
        </div>
      </div>
    </Draggable>
  )
}
