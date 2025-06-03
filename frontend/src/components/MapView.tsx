import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { fetchAllSitesWithMeasurementData } from '../lib/supabase'

// You'll need to add your Mapbox access token to .env.local
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [sites, setSites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const loadSites = async () => {
      try {
        const sitesData = await fetchAllSitesWithMeasurementData()
        setSites(sitesData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sites')
      } finally {
        setLoading(false)
      }
    }
    loadSites()
  }, [])

  useEffect(() => {
    if (!mapContainer.current || map.current || !sites.length) return

    // Initialize map centered on California
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-119.4179, 36.7783], // California center
      zoom: 6
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Wait for map to load before adding data
    map.current.on('load', () => {
      // Prepare GeoJSON data for clustering
      const geojsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: sites
          .filter(site => site.latitude && site.longitude)
          .map(site => ({
            type: 'Feature' as const,
            properties: {
              monitoring_location_id: site.monitoring_location_id,
              site_name: site.site_name,
              county_code: site.county_code,
              state_code: site.state_code,
              measurement_count: site.measurement_count,
              latest_measurement: site.latest_measurement,
              earliest_measurement: site.earliest_measurement,
              latest_value: site.latest_value,
              unit: site.unit,
              variable_name: site.variable_name
            },
            geometry: {
              type: 'Point' as const,
              coordinates: [site.longitude, site.latitude]
            }
          }))
      }

      // Add source for clustering
      map.current!.addSource('sites', {
        type: 'geojson',
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 10, // Max zoom to cluster points on (reduced from 14)
        clusterRadius: 30 // Radius of each cluster when clustering points (reduced from 50)
      })

      // Add cluster circles
      map.current!.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'sites',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6', // Color for clusters with < 10 points
            10,
            '#f1f075', // Color for clusters with 10-100 points
            100,
            '#f28cb1'  // Color for clusters with > 100 points
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20, // Radius for clusters with < 10 points
            10,
            30, // Radius for clusters with 10-100 points
            100,
            40  // Radius for clusters with > 100 points
          ]
        }
      })

      // Add cluster count labels
      map.current!.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'sites',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        }
      })

      // Add individual points (unclustered)
      map.current!.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'sites',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'case',
            ['>=', ['get', 'measurement_count'], 10], '#e74c3c', // Red for 10+
            ['>=', ['get', 'measurement_count'], 3], '#f39c12',  // Orange for 3-10
            '#3498db' // Blue for 0-3
          ],
          'circle-radius': [
            'case',
            ['>=', ['get', 'measurement_count'], 10], 8, // Large for 10+
            ['>=', ['get', 'measurement_count'], 3], 6,  // Medium for 3-10
            4 // Small for 0-3
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff'
        }
      })

      // Click event for clusters
      map.current!.on('click', 'clusters', (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        })
        if (features && features.length > 0) {
          const clusterId = features[0].properties?.cluster_id
          const source = map.current!.getSource('sites') as mapboxgl.GeoJSONSource
          if (source && clusterId) {
            source.getClusterExpansionZoom(clusterId, (err: any, zoom: any) => {
              if (err) return
              const geometry = features[0].geometry as GeoJSON.Point
              map.current!.easeTo({
                center: geometry.coordinates as [number, number],
                zoom: zoom
              })
            })
          }
        }
      })

      // Click event for individual points
      map.current!.on('click', 'unclustered-point', (e) => {
        if (!e.features || e.features.length === 0) return
        
        const feature = e.features[0]
        const geometry = feature.geometry as GeoJSON.Point
        const coordinates = geometry.coordinates.slice() as [number, number]
        const properties = feature.properties

        if (!properties) return

        // Format dates
        const formatDate = (dateString: string | null | undefined): string => {
          if (!dateString) return 'N/A'
          return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }

        const formatDateTime = (dateString: string | null | undefined): string => {
          if (!dateString) return 'N/A'
          return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        }

        // Calculate data span
        const getDataSpan = (earliest: string | null | undefined, latest: string | null | undefined): string => {
          if (!earliest || !latest) return 'N/A'
          const start = new Date(earliest)
          const end = new Date(latest)
          const diffTime = end.getTime() - start.getTime()
          const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365))
          if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''}`
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
          return `${diffDays} day${diffDays > 1 ? 's' : ''}`
        }

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(`
            <div style="font-family: Arial, sans-serif; max-width: 300px;">
              <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #2c3e50;">
                ${properties.site_name || 'Unnamed Site'}
              </h3>
              
              <div style="margin-bottom: 12px; padding: 8px; background-color: #f8f9fa; border-radius: 4px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                  <strong>Location ID:</strong> ${properties.monitoring_location_id || 'N/A'}
                </div>
                <div style="font-size: 12px; color: #666;">
                  <strong>County:</strong> ${properties.county_code || 'N/A'} | 
                  <strong>State:</strong> ${properties.state_code || 'N/A'}
                </div>
              </div>

              <div style="margin-bottom: 12px;">
                <div style="font-size: 14px; color: #2c3e50; margin-bottom: 6px;">
                  <strong>📊 Data Summary</strong>
                </div>
                <div style="font-size: 12px; color: #555; margin-bottom: 4px;">
                  <strong>Total Measurements:</strong> ${properties.measurement_count || 0}
                </div>
                <div style="font-size: 12px; color: #555; margin-bottom: 4px;">
                  <strong>Data Span:</strong> ${getDataSpan(properties.earliest_measurement, properties.latest_measurement)}
                </div>
                <div style="font-size: 12px; color: #555;">
                  <strong>Variable:</strong> ${properties.variable_name || 'N/A'}
                </div>
              </div>

              <div style="border-top: 1px solid #dee2e6; padding-top: 12px;">
                <div style="font-size: 14px; color: #2c3e50; margin-bottom: 6px;">
                  <strong>🕒 Latest Measurement</strong>
                </div>
                <div style="font-size: 12px; color: #555; margin-bottom: 4px;">
                  <strong>Date:</strong> ${formatDateTime(properties.latest_measurement)}
                </div>
                <div style="font-size: 12px; color: #555; margin-bottom: 4px;">
                  <strong>Value:</strong> ${properties.latest_value || 'N/A'} ${properties.unit || ''}
                </div>
                <div style="font-size: 11px; color: #888;">
                  <strong>First Record:</strong> ${formatDate(properties.earliest_measurement)}
                </div>
              </div>
            </div>
          `)
          .addTo(map.current!)
      })

      // Change cursor on hover
      map.current!.on('mouseenter', 'clusters', () => {
        map.current!.getCanvas().style.cursor = 'pointer'
      })
      map.current!.on('mouseleave', 'clusters', () => {
        map.current!.getCanvas().style.cursor = ''
      })
      map.current!.on('mouseenter', 'unclustered-point', () => {
        map.current!.getCanvas().style.cursor = 'pointer'
      })
      map.current!.on('mouseleave', 'unclustered-point', () => {
        map.current!.getCanvas().style.cursor = ''
      })

      // Fit map to show all markers
      if (geojsonData.features.length > 0) {
        const bounds = new mapboxgl.LngLatBounds()
        geojsonData.features.forEach(feature => {
          const geometry = feature.geometry as GeoJSON.Point
          bounds.extend(geometry.coordinates as [number, number])
        })
        map.current!.fitBounds(bounds, { padding: 50 })
      }
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [sites])


  if (loading) return <div style={{ padding: '20px' }}>Loading map data...</div>
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
      {/* Top Banner */}
      <div style={{
        height: '60px',
        backgroundColor: '#2c3e50',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 1000,
        flexShrink: 0
      }}>
        {/* Logo/Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#3498db',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            GW
          </div>
          <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
            California Groundwater Monitor
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1,
        position: 'relative',
        height: 'calc(100% - 60px)'
      }}>
        {/* Map Container - Full width underneath everything */}
        <div 
          ref={mapContainer}
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            zIndex: 1
          }} 
        />

        {/* Sidebar - Overlay on top of map */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: sidebarOpen ? '300px' : '0px',
          height: '100%',
          backgroundColor: '#34495e',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          boxShadow: sidebarOpen ? '2px 0 4px rgba(0,0,0,0.1)' : 'none',
          zIndex: 100
        }}>
          {/* Sidebar Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #2c3e50',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ 
              color: 'white', 
              margin: 0, 
              fontSize: '16px',
              fontWeight: '600'
            }}>
              Map Layers
            </h3>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#bdc3c7',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px'
              }}
            >
              ✕
            </button>
          </div>

          {/* Sidebar Content */}
          <div style={{ padding: '20px' }}>
            {/* Map Layer Selection */}
            <div>
              <h4 style={{ 
                color: '#ecf0f1', 
                fontSize: '12px', 
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: '0 0 12px 0'
              }}>
                Map Layer Selection
              </h4>
              <div style={{
                backgroundColor: '#2c3e50',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #34495e'
                }}>
                  <input
                    type="checkbox"
                    defaultChecked
                    style={{
                      marginRight: '12px',
                      transform: 'scale(1.2)'
                    }}
                  />
                  <span style={{
                    color: '#ecf0f1',
                    fontSize: '14px'
                  }}>
                    Groundwater Historical Sites
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Toggle Button (when closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              position: 'absolute',
              left: '10px',
              top: '10px',
              zIndex: 200,
              backgroundColor: '#34495e',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 12px',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ☰ Map Layers
          </button>
        )}

        {/* Map Controls Overlay */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          {/* Legend */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: '6px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '13px',
            minWidth: '220px',
            border: '1px solid rgba(0,0,0,0.1)',
            pointerEvents: 'auto'
          }}>
            <div style={{ 
              fontWeight: '700', 
              marginBottom: '12px', 
              color: '#2c3e50',
              fontSize: '14px'
            }}>
              Data Volume Legend
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  color: '#e74c3c', 
                  marginRight: '10px',
                  fontSize: '16px',
                  lineHeight: '1'
                }}>●</span>
                <span style={{ color: '#2c3e50' }}>10+ measurements</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  color: '#f39c12', 
                  marginRight: '10px',
                  fontSize: '16px',
                  lineHeight: '1'
                }}>●</span>
                <span style={{ color: '#2c3e50' }}>3-10 measurements</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  color: '#3498db', 
                  marginRight: '10px',
                  fontSize: '16px',
                  lineHeight: '1'
                }}>●</span>
                <span style={{ color: '#2c3e50' }}>0-3 measurements</span>
              </div>
            </div>
            <div style={{ 
              marginTop: '12px', 
              paddingTop: '10px', 
              borderTop: '1px solid #e1e8ed',
              color: '#657786',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              Total sites: {sites.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}