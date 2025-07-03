import { Range } from 'react-range'
import type { GroundwaterMonitoringSite } from '../lib/groundwater/types'
import { exportSitesData } from '../lib/groundwater/dataUtils'
import { useState, useEffect } from 'react'

type SiteWithCount = GroundwaterMonitoringSite & {
  measurement_count?: number
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  measurementFilter: {
    min: number
    max: number | null
  }
  onMeasurementFilterChange: (filter: { min: number; max: number | null }) => void
  filteredSiteCount: number
  filteredSites: SiteWithCount[]
  dateFilter: {
    startYear: number
    endYear: number
  }
  onDateFilterChange: (filter: { startYear: number; endYear: number }) => void
}

const STEP = 1
const MIN = 0
const MAX = 100

// Date range constants (common groundwater monitoring period)
const DATE_MIN = 1900
const DATE_MAX = new Date().getFullYear()

// Available filters configuration
const AVAILABLE_FILTERS = [
  { key: 'measurement', label: 'Measurement Count' },
  { key: 'date', label: 'Date Range' }
]

// Sidebar Component
export function Sidebar({
  isOpen,
  onClose,
  measurementFilter,
  onMeasurementFilterChange,
  dateFilter,
  onDateFilterChange,
  filteredSiteCount,
  filteredSites
}: SidebarProps) {
  const [filters, setFilters] = useState<string[]>(['measurement', 'date'])
  const [localDateFilter, setLocalDateFilter] = useState<[number, number]>([dateFilter.startYear, dateFilter.endYear])
  const [newFilter, setNewFilter] = useState('')

  // Sync local date filter with props
  useEffect(() => {
    console.log('Sidebar: Syncing date filter with props')
    console.log('  - dateFilter prop:', dateFilter)
    console.log('  - localDateFilter state:', localDateFilter)
    setLocalDateFilter([dateFilter.startYear, dateFilter.endYear])
  }, [dateFilter.startYear, dateFilter.endYear])

  const handleExportCSV = () => {
    exportSitesData(filteredSites, 'groundwater_sites.csv')
  }

  const handleAddFilter = () => {
    if (newFilter && !filters.includes(newFilter)) {
      setFilters([...filters, newFilter])
    }
    setNewFilter('')
  }

  const handleRemoveFilter = (filterKey: string) => {
    setFilters(filters.filter(f => f !== filterKey))
    if (filterKey === 'date') {
      const resetFilter = { startYear: DATE_MIN, endYear: DATE_MAX }
      setLocalDateFilter([DATE_MIN, DATE_MAX])
      onDateFilterChange(resetFilter)
    }
    if (filterKey === 'measurement') {
      onMeasurementFilterChange({ min: MIN, max: null })
    }
  }

  const sliderValues = [
    measurementFilter.min,
    measurementFilter.max === null ? MAX : measurementFilter.max
  ]
  

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: isOpen ? '300px' : '0px',
      height: '100%',
      backgroundColor: '#34495e',
      transition: 'width 0.3s ease',
      overflow: 'hidden',
      boxShadow: isOpen ? '2px 0 4px rgba(0,0,0,0.1)' : 'none',
      zIndex: 100
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #2c3e50',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h3 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: '600' }}>
          Map Layers
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#bdc3c7',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Site Type */}
        <h4 style={{
          color: '#ecf0f1',
          fontSize: '12px',
          fontWeight: '600',
          textTransform: 'uppercase',
          marginBottom: '12px'
        }}>
          Site Type Selection
        </h4>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: '#2c3e50',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '8px'
        }}>
          <input
            type="checkbox"
            defaultChecked
            style={{ marginRight: '12px', transform: 'scale(1.2)' }}
          />
          <span style={{ color: '#ecf0f1', fontSize: '14px' }}>
            Groundwater Historical Sites
          </span>
        </label>

        {/* Filters Section */}
        <h4 style={{
          color: '#ecf0f1',
          fontSize: '12px',
          fontWeight: '600',
          textTransform: 'uppercase',
          margin: '20px 0 12px'
        }}>
          Filters
        </h4>

        {/* Sleek Filter Selector */}
        <div style={{ display: 'flex', marginBottom: '16px', height: '36px' }}>
          <select
            value={newFilter}
            onChange={(e) => setNewFilter(e.target.value)}
            style={{
              flexGrow: 1,
              border: '1px solid #3498db',
              borderRight: 'none',
              borderRadius: '6px 0 0 6px',
              padding: '0 10px',
              backgroundColor: '#2c3e50',
              color: '#ecf0f1',
              fontSize: '14px',
              outline: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              cursor: 'pointer',
              height: '100%',
              userSelect: 'none'
            }}
          >
            <option value="">Select filter...</option>
            {AVAILABLE_FILTERS.filter(f => !filters.includes(f.key)).map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <button
            onClick={handleAddFilter}
            style={{
              backgroundColor: '#3498db',
              color: '#fff',
              border: '1px solid #3498db',
              borderRadius: '0 6px 6px 0',
              padding: '0 14px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              height: '100%',
              userSelect: 'none',
              outline: 'none'
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            Add Filter
          </button>
        </div>

        {/* Render Active Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {filters.includes('measurement') && (
            <div key="measurement-filter">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h4 style={{
                  color: '#ecf0f1',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  margin: 0
                }}>
                  Measurement Count Filter
                </h4>
                <button
                  onClick={() => handleRemoveFilter('measurement')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#bdc3c7',
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: 0,
                    marginLeft: '8px'
                  }}
                  title="Remove filter"
                >
                  ✕
                </button>
              </div>

              <Range
                key="measurement-range"
                step={STEP}
                min={MIN}
                max={MAX}
                values={sliderValues}
                onChange={(values) => {
                  const [min, max] = values
                  onMeasurementFilterChange({
                    min,
                    max: max === MAX ? null : max
                  })
                }}
                renderTrack={({ props, children }) => (
                  <div
                    {...props}
                    style={{
                      ...props.style,
                      height: '6px',
                      background: '#34495e',
                      borderRadius: '3px',
                      marginBottom: '12px'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        background: '#3498db',
                        marginLeft: `${((sliderValues[0] - MIN) / (MAX - MIN)) * 100}%`,
                        width: `${((sliderValues[1] - sliderValues[0]) / (MAX - MIN)) * 100}%`
                      }}
                    />
                    {children}
                  </div>
                )}
                renderThumb={({ props }) => (
                  <div
                    {...props}
                    style={{
                      ...props.style,
                      height: '16px',
                      width: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#3498db',
                      border: '2px solid #ecf0f1',
                      cursor: 'pointer',
                      marginTop: '-5px'
                    }}
                  />
                )}
              />
            </div>
          )}

          {filters.includes('date') && (
            <div key="date-filter">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h4 style={{
                  color: '#ecf0f1',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  margin: 0
                }}>
                  Date Range Filter
                </h4>
                <button
                  onClick={() => handleRemoveFilter('date')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#bdc3c7',
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: 0,
                    marginLeft: '8px'
                  }}
                  title="Remove filter"
                >
                  ✕
                </button>
              </div>

              <Range
                key="date-range"
                step={1}
                min={DATE_MIN}
                max={DATE_MAX}
                values={localDateFilter}
                onChange={(values) => {
                  setLocalDateFilter([values[0], values[1]])
                  onDateFilterChange({ startYear: values[0], endYear: values[1] })
                }}
                renderTrack={({ props, children }) => (
                  <div
                    {...props}
                    style={{
                      ...props.style,
                      height: '6px',
                      background: '#34495e',
                      borderRadius: '3px',
                      marginBottom: '12px'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        background: '#3498db',
                        marginLeft: `${((localDateFilter[0] - DATE_MIN) / (DATE_MAX - DATE_MIN)) * 100}%`,
                        width: `${((localDateFilter[1] - localDateFilter[0]) / (DATE_MAX - DATE_MIN)) * 100}%`
                      }}
                    />
                    {children}
                  </div>
                )}
                renderThumb={({ props }) => (
                  <div
                    {...props}
                    style={{
                      ...props.style,
                      height: '16px',
                      width: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#3498db',
                      border: '2px solid #ecf0f1',
                      cursor: 'pointer',
                      marginTop: '-5px'
                    }}
                  />
                )}
              />
              <div style={{ fontSize: '12px', color: '#bdc3c7' }}>
                {localDateFilter[0]} to {localDateFilter[1]}
              </div>
            </div>
          )}
        </div>

        {/* Site Count Display */}
        <div style={{
          marginTop: '24px',
          padding: '12px',
          backgroundColor: '#2c3e50',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#bdc3c7'
        }}>
          Showing sites with <strong style={{ color: '#3498db' }}>{measurementFilter.min}</strong>
          {' to '}
          <strong style={{ color: '#3498db' }}>
            {measurementFilter.max === null ? '∞' : measurementFilter.max}
          </strong> measurements
          {filters.includes('date') && (
            <>
              <br />
              Date range: <strong style={{ color: '#3498db' }}>{dateFilter.startYear}</strong>
              {' to '}
              <strong style={{ color: '#3498db' }}>{dateFilter.endYear}</strong>
            </>
          )}
          <br />
          (<strong style={{ color: '#3498db' }}>{filteredSiteCount.toLocaleString()}</strong> total)
        </div>

        {/* Export Button */}
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={handleExportCSV}
            style={{
              padding: '8px 12px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              width: '100%',
              userSelect: 'none',
              outline: 'none'
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            Export Filtered Sites
          </button>
        </div>
      </div>
    </div>
  )
}