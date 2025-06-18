import { useState, useRef, useEffect } from 'react'

export function MapSettingsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [isOpen])

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        right: '50px',
        width: '260px',
        backgroundColor: '#34495e',
        color: '#ecf0f1',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        transition: 'max-height 0.3s ease, opacity 0.3s ease',
        maxHeight: isOpen ? `${contentHeight + 60}px` : '48px',
        opacity: isOpen ? 1 : 0.95,
        zIndex: 1001
      }}
    >
      {/* Header / Toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          cursor: 'pointer',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#2c3e50'
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Map Settings</span>
        <span style={{ fontSize: '18px' }}>{isOpen ? '✕' : '☰'}</span>
      </div>

      {/* Animated Content */}
      <div
        ref={contentRef}
        style={{
          padding: '16px',
          transition: 'opacity 0.3s ease',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '13px' }}>Map Style</label>
          <select style={{
            marginTop: '4px',
            width: '100%',
            padding: '6px',
            backgroundColor: '#2c3e50',
            border: 'none',
            borderRadius: '4px',
            color: '#ecf0f1',
            fontSize: '13px'
          }}>
            <option value="streets">Standard</option>
            <option value="satellite">Satellite</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '13px' }}>
            <input type="checkbox" defaultChecked style={{ marginRight: '6px' }} />
            Show County Borders
          </label>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '13px' }}>
            <input type="checkbox" style={{ marginRight: '6px' }} />
            Show Labels
          </label>
        </div>

        <div>
          <label style={{ fontSize: '13px' }}>
            <input type="checkbox" style={{ marginRight: '6px' }} />
            Enable 3D Terrain
          </label>
        </div>
      </div>
    </div>
  )
}
