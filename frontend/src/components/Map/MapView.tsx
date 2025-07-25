import { useEffect, useRef, useState, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getSitesWithHistoricalData } from '../../lib/groundwater/getSitesWithHistoricalData'
import { getSiteHistoricalChartData } from '../../lib/groundwater/getSiteHistoricalChartData'
import { getSiteHistoricalSummary } from '../../lib/groundwater/getSiteHistoricalSummary'
import type { GroundwaterMonitoringSite } from '../../lib/groundwater/types'
import type { MapViewProps } from './MapUtils'
import { sitesToEnhancedGeoJSON, formatSitePopupContent, getDataCache } from '../../lib/groundwater/dataUtils'

const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''
if (!mapboxAccessToken) {
  console.error('Mapbox access token is missing!')
}
mapboxgl.accessToken = mapboxAccessToken

export function MapView({
  setChartVisible,
  setChartData,
  setChartError,
  setChartLoading,
  setSelectedSite,
  setFilteredSiteCount,
  setFilteredSites
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [sites, setSites] = useState<GroundwaterMonitoringSite[]>([])
  const [localFilteredSites, setLocalFilteredSites] = useState<GroundwaterMonitoringSite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  
  // Get centralized cache instance
  const cache = getDataCache()

  useEffect(() => {
    const loadSites = async () => {
      try {
        const data = await getSitesWithHistoricalData()
        setSites(data)
        // Cache sites data for centralized access
        cache.setSites(data)
      } catch (err) {
        console.error('Failed to load sites:', err)
        setError(err instanceof Error ? err.message : 'Failed to load sites')
      } finally {
        setLoading(false)
      }
    }
    loadSites()
  }, [cache])

  // Update filtered sites when cache changes
  useEffect(() => {
    const updateFiltered = () => {
      console.log('=== MAPVIEW: UPDATING FILTERED SITES ===')
      const filtered = cache.getFilteredSites()
      console.log('Cache returned filtered sites:', filtered.length)
      
      setLocalFilteredSites(filtered)
      setFilteredSites(filtered)
      setFilteredSiteCount(filtered.length)
      
      console.log('Updated MapView state with', filtered.length, 'sites')
      console.log('=== END MAPVIEW UPDATE ===')
    }
    
    // Update immediately
    updateFiltered()
    
    // Set up the window function for App.tsx to call
    const windowObj = window as unknown as { __updateMapFilteredSites?: () => void }
    windowObj.__updateMapFilteredSites = updateFiltered
    
    return () => {
      delete (window as unknown as { __updateMapFilteredSites?: () => void }).__updateMapFilteredSites
    }
  }, [sites, cache, setFilteredSites, setFilteredSiteCount])

  const geojsonData = useMemo(() => {
    return sitesToEnhancedGeoJSON(localFilteredSites)
  }, [localFilteredSites])

  // Map initialization effect - runs only once
  useEffect(() => {
    console.log('Map effect running...')
    console.log('mapContainer.current:', mapContainer.current)
    console.log('map.current:', map.current)
    
    if (map.current) {
      console.log('Map already exists, skipping')
      return
    }
    
    if (!mapContainer.current) {
      console.log('Container not ready, will retry on next render')
      return
    }

    console.log('Initializing map...')
    console.log('Mapbox token:', mapboxAccessToken ? 'present' : 'missing')
    console.log('Container:', mapContainer.current)

    try {
      const newMap = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-119.4179, 36.7783],
        zoom: 6,
        attributionControl: true
      })

      console.log('Map instance created')

      const handleMapLoad = () => {
        console.log('Map loaded successfully!')
        
        // Add California counties layer
        fetch('/public/California_Counties.geojson')
          .then(response => response.json())
          .then(data => {
            newMap.addSource('california-counties', {
              type: 'geojson',
              data
            })

            newMap.addLayer({
              id: 'california-counties-outline',
              type: 'line',
              source: 'california-counties',
              paint: {
                'line-color': '#000000',
                'line-width': 1.2,
                'line-opacity': 0.2  
              }
            }, 'site-points')
          })
          .catch(err => console.error('Failed to load counties:', err))

        // Add empty sites source
        newMap.addSource('sites', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        })

        // Add sites layer with centralized styling
        newMap.addLayer({
          id: 'site-points',
          type: 'circle',
          source: 'sites',
          paint: {
            'circle-color': [
              'case',
              ['>=', ['get', 'measurement_count'], 10], '#e74c3c',
              ['>=', ['get', 'measurement_count'], 3], '#f39c12',
              '#3498db'
            ],
            'circle-radius': [
              'case',
              ['>=', ['get', 'measurement_count'], 10], 10,
              ['>=', ['get', 'measurement_count'], 3], 8,
              8
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        })

        setMapReady(true)
      }

      newMap.on('load', handleMapLoad)

      // Site click handler
      const handleSiteClick = async (e: mapboxgl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        if (!e.features?.[0]) return
        const feature = e.features[0]
        const props = feature.properties
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
        if (!props) return

        const siteId = props.monitoring_location_id || ''
        const siteName = props.monitoring_location_name || 'Unnamed Site'

        newMap.easeTo({
          center: coords,
          zoom: Math.max(newMap.getZoom(), 12),
          duration: 1000,
          padding: { top: 50, bottom: 50, left: 50, right: 350 }
        })

        const loadingPopup = new mapboxgl.Popup()
          .setLngLat(coords)
          .setHTML(`<div style="text-align:center; padding: 10px;">Loading data for ${siteName}...</div>`)
          .addTo(newMap)

        try {
          setSelectedSite({ id: siteId, name: siteName })
          setChartVisible(true)
          setChartLoading(true)
          setChartError(null)
          setChartData(null)

          // Check cache first
          let chart = cache.getTimeSeriesData(siteId)
          if (!chart) {
            const [, chartData] = await Promise.all([
              getSiteHistoricalSummary(siteId),
              getSiteHistoricalChartData(siteId)
            ])
            chart = chartData
            // Cache the data for future use
            if (chart) {
              cache.setTimeSeriesData(siteId, chart)
            }
          }

          setChartData(chart)
          setChartLoading(false)
          loadingPopup.remove()

          new mapboxgl.Popup()
            .setLngLat(coords)
            .setHTML(formatSitePopupContent(
              siteName,
              siteId,
              props.measurement_count,
              {
                'County': props.county_code,
                'State': props.state_code
              }
            ))
            .addTo(newMap)
        } catch (err) {
          setChartError(err instanceof Error ? err.message : 'Failed to load data')
          setChartLoading(false)
          loadingPopup.remove()

          new mapboxgl.Popup()
            .setLngLat(coords)
            .setHTML(`<div style="color:red; padding: 10px;">Failed to load data</div>`)
            .addTo(newMap)
        }
      }

      newMap.on('click', 'site-points', handleSiteClick)
      newMap.on('mouseenter', 'site-points', () => {
        newMap.getCanvas().style.cursor = 'pointer'
      })
      newMap.on('mouseleave', 'site-points', () => {
        newMap.getCanvas().style.cursor = ''
      })

      newMap.on('error', (e) => {
        console.error('Map error:', e.error)
        setMapError(`Map error: ${e.error?.message || 'Unknown error'}`)
      })

      newMap.addControl(new mapboxgl.NavigationControl(), 'top-right')
      map.current = newMap
    } catch (mapInitError) {
      console.error('Map initialization error:', mapInitError)
      setMapError(`Failed to initialize map: ${mapInitError instanceof Error ? mapInitError.message : 'Unknown error'}`)
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
        setMapReady(false)
      }
    }
  }, [loading])

  // Data update effect - runs when filteredSites changes
  useEffect(() => {
    if (!map.current || !mapReady) return

    // Update sites data layer without recreating map

    const source = map.current.getSource('sites') as mapboxgl.GeoJSONSource
    if (source) {
      source.setData(geojsonData)
      
      // Fit bounds only on initial load (when all sites are showing)
      if (geojsonData.features.length > 0 && localFilteredSites.length === sites.length) {
        const bounds = new mapboxgl.LngLatBounds()
        geojsonData.features.forEach(feature => {
          if (feature.geometry.type === 'Point') {
            bounds.extend(feature.geometry.coordinates as [number, number])
          }
        })
        map.current.fitBounds(bounds, { padding: 50 })
      }
    }
  }, [geojsonData, mapReady, localFilteredSites.length, sites.length])

  if (loading) {
    return (
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center', marginLeft: '200px' }}>Loading map data...</div>
      </div>
    )
  }

  if (error || mapError) {
    return (
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center', color: 'red' }}>
          Error: {error || mapError}
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
