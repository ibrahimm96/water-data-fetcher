import { ReactNode } from 'react'

interface GroundwaterSectionProps {
  isExpanded: boolean
  onToggleExpanded: () => void
  children: ReactNode
}

export function GroundwaterSection({ isExpanded, onToggleExpanded, children }: GroundwaterSectionProps) {
  return (
    <div style={{
      background: '#2c3e50',
      borderRadius: '0',
      marginBottom: '0',
      border: 'none',
      borderBottom: '1px solid #34495e',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      <div
        onClick={onToggleExpanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          cursor: 'pointer',
          background: isExpanded ? '#3498db' : 'transparent',
          transition: 'background-color 0.3s ease'
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.background = 'rgba(52, 152, 219, 0.1)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.background = 'transparent'
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            color: isExpanded ? '#ffffff' : '#ecf0f1', 
            fontSize: '15px',
            fontWeight: '600',
            transition: 'color 0.3s ease'
          }}>
            Groundwater Monitoring Sites
          </span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ 
            color: isExpanded ? '#ffffff' : '#bdc3c7',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            display: 'inline-block'
          }}>
            ▼
          </span>
        </div>
      </div>

      {/* Expandable Content */}
      <div style={{
        maxHeight: isExpanded ? 'calc(100vh - 300px)' : '0px',
        opacity: isExpanded ? 1 : 0,
        overflow: isExpanded ? 'auto' : 'hidden',
        transition: 'max-height 0.3s ease, opacity 0.3s ease'
      }}>
        <div style={{
          padding: '0 20px 20px 20px',
          borderTop: isExpanded ? '1px solid #34495e' : 'none'
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}