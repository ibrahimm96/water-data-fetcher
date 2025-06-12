import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getSitesWithHistoricalData } from '../lib/groundwater/getSitesWithHistoricalData'
import { getSiteHistoricalChartData } from '../lib/groundwater/getSiteHistoricalChartData'
import { getSiteHistoricalSummary } from '../lib/groundwater/getSiteHistoricalSummary'
import type { GroundwaterMonitoringSite } from '../lib/groundwater/types'

// Ensure valid token
const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''
if (!mapboxAccessToken) {
  console.error('Mapbox access token is missing!')
}
mapboxgl.accessToken = mapboxAccessToken

interface ChartData {
  data: Array<{ date: number; value: number; dateString: string }>
  unit: string | null
  variable_name: string | null
  dateRange: { start: string; end: string } | null
  totalPoints?: number
}

interface MapViewProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  setChartVisible: (visible: boolean) => void
  setChartData: (data: ChartData | null) => void
  setChartError: (error: string | null) => void
  setChartLoading: (loading: boolean) => void
  setSelectedSite: (site: { id: string; name: string } | null) => void
}

export function MapView({
  setChartVisible,
  setChartData,
  setChartError,
  setChartLoading,
  setSelectedSite
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [sites, setSites] = useState<GroundwaterMonitoringSite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load sites data
  useEffect(() => {
    const loadSites = async () => {
      console.log('Loading sites data...')
      try {
        const data = await getSitesWithHistoricalData()
        console.log(`Loaded ${data.length} sites`)
        setSites(data)
      } catch (err) {
        console.error('Failed to load sites:', err)
        setError(err instanceof Error ? err.message : 'Failed to load sites')
      } finally {
        setLoading(false)
      }
    }
    loadSites()
  }, [])

  // Initialize map when sites are loaded
  useEffect(() => {
    // Guard clauses
    if (!mapContainer.current) {
      console.log('Map container not available')
      return
    }
    
    if (map.current) {
      console.log('Map already initialized')
      return
    }
    
    if (!sites.length) {
      console.log('No sites available yet')
      return
    }

    console.log('Initializing map...')
    
    try {
      const newMap = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-119.4179, 36.7783],
        zoom: 6,
        attributionControl: true
      })

      // Handle map load event
      newMap.on('load', () => {
        console.log('Map loaded successfully')
        
        try {
          // Create GeoJSON data
          const validSites = sites.filter(site => site.geometry?.type === 'Point')
          console.log(`Valid sites with geometry: ${validSites.length} out of ${sites.length}`)
          
          if (!validSites.length) {
            console.error('No valid sites with point geometry found!')
            return
          }

          const geojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: validSites.map(site => ({
              type: 'Feature' as const,
              geometry: site.geometry as GeoJSON.Geometry,
              properties: {
                monitoring_location_id: site.monitoring_location_id,
                monitoring_location_name: site.monitoring_location_name || 'Unnamed Site',
                county_code: site.county_code,
                state_code: site.state_code,
              }
            }))
          }

          // Add source
          newMap.addSource('sites', {
            type: 'geojson',
            data: geojson,
            cluster: true,
            clusterRadius: 30
          })

          // Add cluster layer
          newMap.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'sites',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step', 
                ['get', 'point_count'], 
                '#51bbd6',   // color for point_count < 10
                10, 
                '#f1f075',   // color for point_count >= 10 and < 100
                100, 
                '#f28cb1'    // color for point_count >= 100
              ],
              'circle-radius': [
                'step', 
                ['get', 'point_count'], 
                20,   // size for point_count < 10
                10, 
                30,   // size for point_count >= 10 and < 100
                100, 
                40    // size for point_count >= 100
              ]
            }
          })

          // Add cluster count layer
          newMap.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'sites',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12
            }
          })

          // Add individual point layer with improved visibility
          newMap.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'sites',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': '#3498db',
              'circle-radius': 8, // Larger for better visibility
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          })

          // Fit map bounds to show all points
          if (geojson.features.length > 0) {
            const bounds = new mapboxgl.LngLatBounds()
            geojson.features.forEach(feature => {
              const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
              bounds.extend(coords)
            })
            newMap.fitBounds(bounds, { padding: 50 })
          }

          // Setup click handler for points
          newMap.on('click', 'unclustered-point', async (e) => {
            if (!e.features || !e.features[0]) {
              console.log('No feature clicked')
              return
            }
            
            const feature = e.features[0]
            const props = feature.properties
            const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]

            if (!props) {
              console.error('Feature has no properties')
              return
            }

            const siteId = props.monitoring_location_id || ''
            const siteName = props.monitoring_location_name || 'Unnamed Site'
            
            console.log(`Clicked site: ${siteName} (${siteId})`)

            // Zoom to clicked point
            newMap.easeTo({
              center: coords,
              zoom: Math.max(newMap.getZoom(), 12),
              duration: 1000,
              padding: { top: 50, bottom: 50, left: 50, right: 350 }
            })

            // Show loading popup
            const loadingPopup = new mapboxgl.Popup()
              .setLngLat(coords)
              .setHTML(`<div style="text-align:center; padding: 10px;">Loading data for ${siteName}...</div>`)
              .addTo(newMap)

            try {
              // Update chart state
              setSelectedSite({ id: siteId, name: siteName })
              setChartVisible(true)
              setChartLoading(true)
              setChartError(null)
              setChartData(null)

              // Fetch data
              console.log(`Fetching historical data for site ${siteId}...`)
              const [, chart] = await Promise.all([
                getSiteHistoricalSummary(siteId),
                getSiteHistoricalChartData(siteId)
              ])
              console.log('Historical data fetched successfully')

              // Update state with fetched data
              setChartData(chart)
              setChartLoading(false)
              loadingPopup.remove()
            } catch (err) {
              console.error('Failed to load historical data:', err)
              setChartError(err instanceof Error ? err.message : 'Failed to load data')
              setChartLoading(false)
              loadingPopup.remove()
              
              // Show error popup
              new mapboxgl.Popup()
                .setLngLat(coords)
                .setHTML(`<div style="color:red; padding: 10px;">Failed to load data</div>`)
                .addTo(newMap)
            }
          })

          // Setup cluster click handler
          newMap.on('click', 'clusters', (e) => {
            const features = newMap.queryRenderedFeatures(e.point, { layers: ['clusters'] })
            if (!features.length) return
            
            const clusterId = features[0].properties?.cluster_id
            const source = newMap.getSource('sites') as mapboxgl.GeoJSONSource
            
            source.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err || zoom == null) return

              const coordinates = (features[0].geometry as GeoJSON.Point).coordinates
              newMap.easeTo({
                center: coordinates as [number, number],
                zoom // now guaranteed to be number
              })
            })
          })

          // Cursor styling
          newMap.on('mouseenter', 'unclustered-point', () => {
            newMap.getCanvas().style.cursor = 'pointer'
          })
          
          newMap.on('mouseleave', 'unclustered-point', () => {
            newMap.getCanvas().style.cursor = ''
          })
          
          newMap.on('mouseenter', 'clusters', () => {
            newMap.getCanvas().style.cursor = 'pointer'
          })
          
          newMap.on('mouseleave', 'clusters', () => {
            newMap.getCanvas().style.cursor = ''
          })
          
          console.log('Map setup completed successfully')
          
        } catch (setupError) {
          console.error('Error setting up map layers:', setupError)
          setError(`Error setting up map: ${setupError instanceof Error ? setupError.message : 'Unknown error'}`)
        }
      })

      // Handle map errors
      newMap.on('error', (e) => {
        console.error('Mapbox error:', e)
        setError(`Map error: ${e.error?.message || 'Unknown error'}`)
      })

      // Add navigation controls
      newMap.addControl(new mapboxgl.NavigationControl(), 'top-right')
      
      // Store map reference
      map.current = newMap
      
    } catch (mapError) {
      console.error('Failed to initialize map:', mapError)
      setError(`Failed to initialize map: ${mapError instanceof Error ? mapError.message : 'Unknown error'}`)
    }

    // Cleanup function
    return () => {
      if (map.current) {
        console.log('Cleaning up map')
        map.current.remove()
        map.current = null
      }
    }
  }, [sites, setChartData, setChartError, setChartLoading, setChartVisible, setSelectedSite])

  // Add loading overlay
  if (loading) {
    return (
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div>Loading map data...</div>
        </div>
      </div>
    )
  }

  // Show error if one occurred
  if (error) {
    return (
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
        <div style={{ textAlign: 'center', color: 'red' }}>
          <div>Error: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        position: 'absolute', 
        top: 0, 
        bottom: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1 
      }} 
    />
  )
}