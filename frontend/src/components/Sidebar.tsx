// components/Sidebar.tsx
interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

// Sidebar Component
export function Sidebar({ isOpen, onClose }: SidebarProps) {
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
          Map Layer Selection
        </h4>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: '#2c3e50',
          borderRadius: '4px',
          cursor: 'pointer'
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
    </div>
  )
}
