import { Range } from 'react-range'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  measurementFilter: {
    min: number
    max: number | null
  }
  onMeasurementFilterChange: (filter: { min: number; max: number | null }) => void
  filteredSiteCount: number
}

const STEP = 1
const MIN = 0
const MAX = 100

// Sidebar Component
export function Sidebar({
  isOpen,
  onClose,
  measurementFilter,
  onMeasurementFilterChange,
  filteredSiteCount
}: SidebarProps) {
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
      </div>

      <div style={{ padding: '20px' }}>
        <h4 style={{
          color: '#ecf0f1',
          fontSize: '12px',
          fontWeight: '600',
          textTransform: 'uppercase',
          marginBottom: '12px'
        }}>
          Measurement Count Filter
        </h4>

        {/* Dual Handle Range Slider */}
        <Range
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
                marginBottom: '24px'
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
                backgroundColor: '#1abc9c',
                border: '2px solid #ecf0f1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '-5px' 
              }}
            />
          )}

        />

        <div style={{
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
          <br />
          (<strong style={{ color: '#3498db' }}>{filteredSiteCount.toLocaleString()}</strong> total)
        </div>
      </div>
    </div>
  )
}