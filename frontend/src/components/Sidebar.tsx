// components/Sidebar.tsx
interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  measurementFilter: {
    min: number
    max: number | null
  }
  onMeasurementFilterChange: (filter: { min: number; max: number | null }) => void
}

// Sidebar Component
export function Sidebar({ isOpen, onClose, measurementFilter, onMeasurementFilterChange }: SidebarProps) {
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
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {[
              { label: 'All Sites', min: 0, max: null },
              { label: '1+ Measurements', min: 1, max: null },
              { label: '5+ Measurements', min: 5, max: null },
              { label: '10+ Measurements', min: 10, max: null },
              { label: '25+ Measurements', min: 25, max: null }
            ].map((option) => (
              <button
                key={option.label}
                onClick={() => onMeasurementFilterChange({ min: option.min, max: option.max })}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: 
                    measurementFilter.min === option.min && measurementFilter.max === option.max
                      ? '#3498db' 
                      : '#2c3e50',
                  color: '#ecf0f1',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (measurementFilter.min !== option.min || measurementFilter.max !== option.max) {
                    e.currentTarget.style.backgroundColor = '#34495e'
                  }
                }}
                onMouseLeave={(e) => {
                  if (measurementFilter.min !== option.min || measurementFilter.max !== option.max) {
                    e.currentTarget.style.backgroundColor = '#2c3e50'
                  }
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          padding: '12px',
          backgroundColor: '#2c3e50',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#bdc3c7'
        }}>
          Currently showing sites with {measurementFilter.min}+ measurements
          {measurementFilter.max ? ` and ≤${measurementFilter.max}` : ''}
        </div>
      </div>
    </div>
  )
}
