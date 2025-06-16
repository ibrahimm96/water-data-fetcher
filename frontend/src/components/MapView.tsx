import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getSitesWithHistoricalData } from '../lib/groundwater/getSitesWithHistoricalData'
import { getSiteHistoricalChartData } from '../lib/groundwater/getSiteHistoricalChartData'
import { getSiteHistoricalSummary } from '../lib/groundwater/getSiteHistoricalSummary'
import type { GroundwaterMonitoringSite } from '../lib/groundwater/types'
import type { MapViewProps } from './MapUtils'

const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''
if (!mapboxAccessToken) {
  console.error('Mapbox access token is missing!')
}
mapboxgl.accessToken = mapboxAccessToken

export function MapView({
  measurementFilter,
  setChartVisible,
  setChartData,
  setChartError,
  setChartLoading,
  setSelectedSite
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [sites, setSites] = useState<GroundwaterMonitoringSite[]>([])
  const [filteredSites, setFilteredSites] = useState<GroundwaterMonitoringSite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // Filter sites based on measurement count
  useEffect(() => {
    const filtered = sites.filter(site => {
      const count = site.measurement_count || 0
      return count >= measurementFilter.min && 
             (measurementFilter.max === null || count <= measurementFilter.max)
    })
    setFilteredSites(filtered)
    console.log(`Filtered to ${filtered.length} sites (${measurementFilter.min}+ measurements)`)
  }, [sites, measurementFilter])

  useEffect(() => {
    if (!mapContainer.current || map.current || !filteredSites.length) return

    try {
      const newMap = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-119.4179, 36.7783],
        zoom: 6,
        attributionControl: true
      })

      newMap.on('load', () => {
        const validSites = filteredSites.filter(site => site.geometry?.type === 'Point')
        if (!validSites.length) return

        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: validSites.map(site => ({
            type: 'Feature',
            geometry: site.geometry as GeoJSON.Geometry,
            properties: {
              monitoring_location_id: site.monitoring_location_id,
              monitoring_location_name: site.monitoring_location_name || 'Unnamed Site',
              county_code: site.county_code,
              state_code: site.state_code,
              measurement_count: site.measurement_count || 0
            }
          }))
        }

        newMap.addSource('sites', {
          type: 'geojson',
          data: geojson,
          cluster: true,
          clusterRadius: 30
        })

        newMap.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'sites',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#51bbd6', 10,
              '#f1f075', 100,
              '#f28cb1'
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20, 10,
              30, 100,
              40
            ]
          }
        })

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

        newMap.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'sites',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#3498db',
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        })

        if (geojson.features.length > 0) {
          const bounds = new mapboxgl.LngLatBounds()
          geojson.features.forEach(feature => {
            const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
            bounds.extend(coords)
          })
          newMap.fitBounds(bounds, { padding: 50 })
        }

        newMap.on('click', 'unclustered-point', async (e) => {
          if (!e.features?.[0]) return
          const feature = e.features[0]
          const props = feature.properties
          const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]

          if (!props) return

          const siteId = props.monitoring_location_id || ''
          const siteName = props.monitoring_location_name || 'Unnamed Site'

          newMap.easeTo({ center: coords, zoom: Math.max(newMap.getZoom(), 12), duration: 1000, padding: { top: 50, bottom: 50, left: 50, right: 350 } })

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

            const [, chart] = await Promise.all([
              getSiteHistoricalSummary(siteId),
              getSiteHistoricalChartData(siteId)
            ])
            setChartData(chart)
            setChartLoading(false)
            loadingPopup.remove()

            new mapboxgl.Popup()
              .setLngLat(coords)
              .setHTML(`
                <div style="padding: 10px; font-size: 14px;">
                  <strong>${siteName}</strong><br/>
                  Site ID: ${siteId}<br/>
                  WIP
                </div>
              `)
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
        })

        newMap.on('click', 'clusters', (e) => {
          const features = newMap.queryRenderedFeatures(e.point, { layers: ['clusters'] })
          if (!features.length) return

          const clusterId = features[0].properties?.cluster_id
          const source = newMap.getSource('sites') as mapboxgl.GeoJSONSource

          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err || zoom == null) return
            const coordinates = (features[0].geometry as GeoJSON.Point).coordinates
            newMap.easeTo({ center: coordinates as [number, number], zoom })
          })
        })

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
      })

      newMap.on('error', (e) => {
        setError(`Map error: ${e.error?.message || 'Unknown error'}`)
      })

      newMap.addControl(new mapboxgl.NavigationControl(), 'top-right')
      map.current = newMap
    } catch (mapError) {
      setError(`Failed to initialize map: ${mapError instanceof Error ? mapError.message : 'Unknown error'}`)
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [filteredSites, setChartData, setChartError, setChartLoading, setChartVisible, setSelectedSite])

  // Update map data when filteredSites changes
  useEffect(() => {
    if (!map.current) return

    const validSites = filteredSites.filter(site => site.geometry?.type === 'Point')
    
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: validSites.map(site => ({
        type: 'Feature',
        geometry: site.geometry as GeoJSON.Geometry,
        properties: {
          monitoring_location_id: site.monitoring_location_id,
          monitoring_location_name: site.monitoring_location_name || 'Unnamed Site',
          county_code: site.county_code,
          state_code: site.state_code,
          measurement_count: site.measurement_count || 0
        }
      }))
    }

    const source = map.current.getSource('sites') as mapboxgl.GeoJSONSource
    if (source) {
      source.setData(geojson)
    }
  }, [filteredSites])

  if (loading) {
    return (
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
        <div style={{ textAlign: 'center' }}>Loading map data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
        <div style={{ textAlign: 'center', color: 'red' }}>Error: {error}</div>
      </div>
    )
  }

  return (
    <div ref={mapContainer} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 1 }} />
  )
}
