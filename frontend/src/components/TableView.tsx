import { useState, useEffect } from 'react'
import { fetchGroundwaterSites, fetchRecentMeasurements, fetchTop100SitesWithMostData, type GroundwaterTimeSeries, type GroundwaterMonitoringSite } from '../lib/supabase'

export function TableView() {
  const [sites, setSites] = useState<GroundwaterMonitoringSite[]>([])
  const [recentMeasurements, setRecentMeasurements] = useState<GroundwaterTimeSeries[]>([])
  const [top100Sites, setTop100Sites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'sites' | 'measurements' | 'top100'>('top100')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [sitesData, measurementsData, top100SitesData] = await Promise.all([
          fetchGroundwaterSites(),
          fetchRecentMeasurements(50),
          fetchTop100SitesWithMostData()
        ])
        setSites(sitesData)
        setRecentMeasurements(measurementsData)
        setTop100Sites(top100SitesData)
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) return <div style={{ padding: '20px' }}>Loading groundwater data...</div>
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>

  const tabStyle = {
    padding: '10px 20px',
    border: '1px solid #ddd',
    borderBottom: 'none',
    backgroundColor: '#f8f9fa',
    cursor: 'pointer',
    borderTopLeftRadius: '4px',
    borderTopRightRadius: '4px'
  }

  const activeTabStyle = {
    ...tabStyle,
    backgroundColor: 'white',
    fontWeight: 'bold'
  }

  return (
    <div style={{ padding: '0 20px' }}>
      <h1>California Groundwater Data Tables</h1>
      
      <div style={{ display: 'flex', marginBottom: '20px' }}>
        <div 
          style={activeTab === 'top100' ? activeTabStyle : tabStyle}
          onClick={() => setActiveTab('top100')}
        >
          Top 100 Sites by Data Volume ({top100Sites.length})
        </div>
        <div 
          style={activeTab === 'sites' ? activeTabStyle : tabStyle}
          onClick={() => setActiveTab('sites')}
        >
          All Monitoring Sites ({sites.length})
        </div>
        <div 
          style={activeTab === 'measurements' ? activeTabStyle : tabStyle}
          onClick={() => setActiveTab('measurements')}
        >
          Recent Measurements ({recentMeasurements.length})
        </div>
      </div>

      {activeTab === 'top100' && (
        <section style={{ border: '1px solid #ddd', borderTop: 'none', padding: '20px', backgroundColor: 'white' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Rank</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Location ID</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Site Name</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Measurement Count</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Latitude</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Longitude</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>County</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>State</th>
                </tr>
              </thead>
              <tbody>
                {top100Sites.map((site, index) => (
                  <tr key={site.monitoring_location_id}>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{site.monitoring_location_id}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{site.site_name || 'N/A'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                      {site.measurement_count}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      {site.latitude?.toFixed(4) || 'N/A'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      {site.longitude?.toFixed(4) || 'N/A'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{site.county_code || 'N/A'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{site.state_code || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'sites' && (
        <section style={{ border: '1px solid #ddd', borderTop: 'none', padding: '20px', backgroundColor: 'white' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Location ID</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Site Name</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>County</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>State</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Altitude</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Agency</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.monitoring_location_number}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{site.monitoring_location_id || site.monitoring_location_number}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{site.monitoring_location_name || 'N/A'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{site.county_code || 'N/A'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{site.state_code || 'N/A'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{site.altitude || 'N/A'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{site.agency_code || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'measurements' && (
        <section style={{ border: '1px solid #ddd', borderTop: 'none', padding: '20px', backgroundColor: 'white' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Location ID</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Site Name</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Date/Time</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Measurement Value</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Unit</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Variable</th>
                </tr>
              </thead>
              <tbody>
                {recentMeasurements.map((measurement, index) => (
                  <tr key={index}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{measurement.monitoring_location_id}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      {measurement.site_name || 'N/A'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      {measurement.measurement_datetime ? new Date(measurement.measurement_datetime).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{measurement.measurement_value}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{measurement.unit || 'N/A'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{measurement.variable_name || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}