import type { Geometry } from 'geojson'

export interface GroundwaterMonitoringSite {
    id: number
    inserted_at: string
    updated_at: string
    monitoring_location_id: string | null
    geometry: Geometry | null
    agency_code: string | null
    monitoring_location_number: string
    monitoring_location_name: string | null
    state_code: string | null
    county_code: string | null
    site_type_code: string | null
    hydrologic_unit_code: string | null
    aquifer_code: string | null
    aquifer_type_code: string | null
    altitude: number | null
    vertical_datum: string | null
    measurement_count?: number
    actualDateRange?: {
        startYear: number
        endYear: number
        firstMeasurement: string
        lastMeasurement: string
    }
}

export interface GroundwaterHistoricalTimeSeries {
    id: number
    monitoring_location_number: string
    site_name: string | null
    agency_code: string | null
    huc_code: string | null
    state_code: string | null
    county_code: string | null
    latitude: number | null
    longitude: number | null
    geometry: Geometry | null
    variable_code: string | null
    variable_name: string | null
    variable_description: string | null
    unit: string | null
    variable_id: number | null
    measurement_datetime: string | null
    measurement_value: number | null
    qualifiers: string[] | null
    method_id: number | null
}