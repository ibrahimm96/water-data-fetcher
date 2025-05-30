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
      const geojsonData = {
        type: 'FeatureCollection',
        features: sites
          .filter(site => site.latitude && site.longitude)
          .map(site => ({
            type: 'Feature',
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
              type: 'Point',
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
        const clusterId = features[0].properties.cluster_id
        map.current!.getSource('sites').getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return
          map.current!.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom
          })
        })
      })

      // Click event for individual points
      map.current!.on('click', 'unclustered-point', (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice()
        const properties = e.features[0].properties

        // Format dates
        const formatDate = (dateString) => {
          if (!dateString) return 'N/A'
          return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }

        const formatDateTime = (dateString) => {
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
        const getDataSpan = (earliest, latest) => {
          if (!earliest || !latest) return 'N/A'
          const start = new Date(earliest)
          const end = new Date(latest)
          const diffYears = Math.floor((end - start) / (1000 * 60 * 60 * 24 * 365))
          if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''}`
          const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24))
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
                  <strong>Location ID:</strong> ${properties.monitoring_location_id}
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
                  <strong>Total Measurements:</strong> ${properties.measurement_count}
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
                  <strong>Value:</strong> ${properties.latest_value} ${properties.unit || ''}
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
          bounds.extend(feature.geometry.coordinates)
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
  <div style={{ padding: '20px' }}>
    <div style={{ marginBottom: '20px' }}>
      <h1 style={{ fontSize: '20px', margin: 0 }}>
        California Groundwater Monitoring Sites
      </h1>
      <p style={{ color: '#666', fontSize: '14px' }}>
        Showing all sites with historical time series data. Marker size and color indicate data volume. Total sites displayed: {sites.length}.
      </p>
      <div style={{ display: 'flex', gap: '20px', fontSize: '12px', marginBottom: '10px' }}>
        <span><span style={{ color: '#e74c3c' }}>●</span> 10+ measurements</span>
        <span><span style={{ color: '#f39c12' }}>●</span> 3-10 measurements</span>
        <span><span style={{ color: '#3498db' }}>●</span> 0-3 measurements</span>
      </div>
    </div>

    <div 
      ref={mapContainer} 
      style={{ 
        height: '675px', 
        width: '1300px', 
        borderRadius: '8px',
        border: '1px solid #ddd'
      }} 
    />
  </div>
);
}