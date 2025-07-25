import { useState, useEffect } from 'react'
import { MapView } from './components/Map/MapView'
import { Sidebar } from './components/Sidebar/Sidebar'
import { DraggablePanel } from './components/Draggable_Panel/DraggablePanel'
import type { DraggablePanelData } from './components/Draggable_Panel/types'
import { MapSettingsPanel } from './components/MapSettingsPanel'
import type { GroundwaterMonitoringSite } from './lib/groundwater/types'
import { getDataCache, type MeasurementFilter, type DateFilter, type MinMaxValueFilter, type AverageValueFilter, type CountyFilter } from './lib/groundwater/dataCache'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedSite, setSelectedSite] = useState<{ id: string; name: string } | null>(null)
  const [chartVisible, setChartVisible] = useState(false)
  const [chartData, setChartData] = useState<DraggablePanelData['chartData']>(null)
  const [chartLoading, setChartLoading] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)


  const [measurementFilter, setMeasurementFilter] = useState<MeasurementFilter>({
    min: 0,
    max: null
  })

  // Initialize filters in cache on startup
  useEffect(() => {
    console.log('=== INITIALIZING FILTERS ===')
    const cache = getDataCache()
    const initMeasurement = { min: 0, max: null }
    const initDate = { startYear: 1900, endYear: new Date().getFullYear() }
    const initMinMaxValue = { min: null, max: null }
    const initAverageValue = { min: null, max: null }
    const initCounty = { selectedCounties: [] }
    console.log('Setting initial measurement filter:', initMeasurement)
    console.log('Setting initial date filter:', initDate)
    console.log('Setting initial min/max value filter:', initMinMaxValue)
    console.log('Setting initial average value filter:', initAverageValue)
    console.log('Setting initial county filter:', initCounty)
    cache.setFilter('measurement', initMeasurement)
    cache.setFilter('date', initDate)
    cache.setFilter('minMaxValue', initMinMaxValue)
    cache.setFilter('averageValue', initAverageValue)
    cache.setFilter('county', initCounty)
    console.log('=== FILTERS INITIALIZED ===')
  }, [])

  const [dateFilter, setDateFilter] = useState<DateFilter>({
    startYear: 1900,
    endYear: new Date().getFullYear()
  })

  const [minMaxValueFilter, setMinMaxValueFilter] = useState<MinMaxValueFilter>({
    min: null,
    max: null
  })

  const [averageValueFilter, setAverageValueFilter] = useState<AverageValueFilter>({
    min: null,
    max: null
  })

  const [countyFilter, setCountyFilter] = useState<CountyFilter>({
    selectedCounties: []
  })

  const [filteredSiteCount, setFilteredSiteCount] = useState(0)
  const [filteredSites, setFilteredSites] = useState<GroundwaterMonitoringSite[]>([])

  // Connect filters to cache system
  useEffect(() => {
    console.log('=== APP.tsx: MEASUREMENT FILTER CHANGED ===')
    console.log('New measurement filter:', measurementFilter)
    
    const cache = getDataCache()
    cache.setFilter('measurement', measurementFilter)
    
    // Trigger MapView update
    const updateFn = (window as unknown as { __updateMapFilteredSites?: () => void }).__updateMapFilteredSites
    console.log('MapView update function available:', !!updateFn)
    if (updateFn) {
      console.log('Calling MapView update...')
      updateFn()
    }
    console.log('=== END APP.tsx MEASUREMENT FILTER ===')
  }, [measurementFilter])

  useEffect(() => {
    console.log('=== APP.tsx: DATE FILTER CHANGED ===')
    console.log('New date filter:', dateFilter)
    
    const cache = getDataCache()
    cache.setFilter('date', dateFilter)
    
    // Trigger MapView update
    const updateFn = (window as unknown as { __updateMapFilteredSites?: () => void }).__updateMapFilteredSites
    console.log('MapView update function available:', !!updateFn)
    if (updateFn) {
      console.log('Calling MapView update...')
      updateFn()
    }
    console.log('=== END APP.tsx DATE FILTER ===')
  }, [dateFilter])

  useEffect(() => {
    console.log('=== APP.tsx: MIN/MAX VALUE FILTER CHANGED ===')
    console.log('New min/max value filter:', minMaxValueFilter)
    
    const cache = getDataCache()
    cache.setFilter('minMaxValue', minMaxValueFilter)
    
    // Trigger MapView update
    const updateFn = (window as unknown as { __updateMapFilteredSites?: () => void }).__updateMapFilteredSites
    console.log('MapView update function available:', !!updateFn)
    if (updateFn) {
      console.log('Calling MapView update...')
      updateFn()
    }
    console.log('=== END APP.tsx MIN/MAX VALUE FILTER ===')
  }, [minMaxValueFilter])

  useEffect(() => {
    console.log('=== APP.tsx: AVERAGE VALUE FILTER CHANGED ===')
    console.log('New average value filter:', averageValueFilter)
    
    const cache = getDataCache()
    cache.setFilter('averageValue', averageValueFilter)
    
    // Trigger MapView update
    const updateFn = (window as unknown as { __updateMapFilteredSites?: () => void }).__updateMapFilteredSites
    console.log('MapView update function available:', !!updateFn)
    if (updateFn) {
      console.log('Calling MapView update...')
      updateFn()
    }
    console.log('=== END APP.tsx AVERAGE VALUE FILTER ===')
  }, [averageValueFilter])

  useEffect(() => {
    console.log('=== APP.tsx: COUNTY FILTER CHANGED ===')
    console.log('New county filter:', countyFilter)
    
    const cache = getDataCache()
    cache.setFilter('county', countyFilter)
    
    // Trigger MapView update
    const updateFn = (window as unknown as { __updateMapFilteredSites?: () => void }).__updateMapFilteredSites
    console.log('MapView update function available:', !!updateFn)
    if (updateFn) {
      console.log('Calling MapView update...')
      updateFn()
    }
    console.log('=== END APP.tsx COUNTY FILTER ===')
  }, [countyFilter])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      width: '125%',
      height: '125%'
    }}>
      {/* Top Banner */}
      <div style={{
        height: '60px',
        backgroundColor: '#2c3e50',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        flexShrink: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'white',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px'
          }}>
            <svg width="32" height="32" viewBox="0 0 512 512">
              <path d="M256 80c-88 112-128 192-128 256 0 70.7 57.3 128 128 128s128-57.3 128-128c0-64-40-144-128-256z" fill="url(#waterGradient)" />
              <ellipse cx="256" cy="400" rx="180" ry="30" fill="none" stroke="#2980b9" strokeWidth="12" opacity="0.6"/>
              <ellipse cx="256" cy="400" rx="140" ry="22" fill="none" stroke="#3498db" strokeWidth="10" opacity="0.7"/>
              <ellipse cx="256" cy="400" rx="100" ry="16" fill="none" stroke="#5dade2" strokeWidth="8" opacity="0.8"/>
              <defs>
                <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3498db" />
                  <stop offset="50%" stopColor="#2980b9" />
                  <stop offset="100%" stopColor="#1f5582" />
                </linearGradient>
              </defs>
            </svg>
          </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>water3D</span>
              <span style={{ color: '#bdc3c7', fontSize: '12px' }}>Water Monitoring Site Visualization Tool</span>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          measurementFilter={measurementFilter}
          onMeasurementFilterChange={setMeasurementFilter}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          minMaxValueFilter={minMaxValueFilter}
          onMinMaxValueFilterChange={setMinMaxValueFilter}
          averageValueFilter={averageValueFilter}
          onAverageValueFilterChange={setAverageValueFilter}
          countyFilter={countyFilter}
          onCountyFilterChange={setCountyFilter}
          filteredSiteCount={filteredSiteCount}
          filteredSites={filteredSites}
        />
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              zIndex: 200,
              padding: '12px 16px',
              backgroundColor: '#34495e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            ☰ Map Layers
          </button>
        )}

        <MapView
          setChartVisible={setChartVisible}
          setChartData={setChartData}
          setChartError={setChartError}
          setChartLoading={setChartLoading}
          setSelectedSite={setSelectedSite}
          setFilteredSiteCount={setFilteredSiteCount}
          setFilteredSites={setFilteredSites}
        />

        <DraggablePanel
          siteId={selectedSite?.id || ''}
          siteName={selectedSite?.name || ''}
          isVisible={chartVisible}
          onClose={() => {
            setChartVisible(false)
            setSelectedSite(null)
            setChartData(null)
            setChartError(null)
          }}
          chartData={chartData}
          isLoading={chartLoading}
          error={chartError}
        />

        <MapSettingsPanel
        />
      </div>
    </div>
  )
}

export default App

