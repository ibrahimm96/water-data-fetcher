interface SiteCountDisplayProps {
  measurementFilter: { min: number; max: number | null }
  dateFilter: { startYear: number; endYear: number }
  filteredSiteCount: number
  isDateFilterActive: boolean
}

export function SiteCountDisplay({ 
  measurementFilter, 
  dateFilter, 
  filteredSiteCount, 
  isDateFilterActive 
}: SiteCountDisplayProps) {
  return (
    <div style={{
      marginTop: '0',
      padding: '16px 20px',
      background: '#2c3e50',
      borderRadius: '0',
      fontSize: '13px',
      color: '#bdc3c7',
      borderBottom: '1px solid #34495e'
    }}>
      Showing sites with <strong style={{ color: '#3498db' }}>{measurementFilter.min}</strong>
      {' to '}
      <strong style={{ color: '#3498db' }}>
        {measurementFilter.max === null ? '∞' : measurementFilter.max}
      </strong> measurements
      {isDateFilterActive && (
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
  )
}