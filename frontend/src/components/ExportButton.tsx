interface ExportButtonProps {
  onExport: () => void
}

export function ExportButton({ onExport }: ExportButtonProps) {
  return (
    <div style={{ padding: '16px 20px' }}>
      <button
        onClick={onExport}
        style={{
          padding: '12px 20px',
          background: 'transparent',
          color: '#ecf0f1',
          border: '1px solid #34495e',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: '500',
          fontSize: '14px',
          width: '100%',
          outline: 'none',
          transition: 'border-color 0.3s ease, color 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#3498db'
          e.currentTarget.style.color = '#3498db'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#34495e'
          e.currentTarget.style.color = '#ecf0f1'
        }}
      >
        <span>⬇</span>
        Export Sites
      </button>
    </div>
  )
}