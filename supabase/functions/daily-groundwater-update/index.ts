// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration
const LOOKBACK_DAYS = 7; // Look back 7 days to catch any late-arriving data
const USE_PRIORITY_COUNTIES_ONLY = true; // Set to false to process all 58 counties daily
const COUNTY_BATCH_SIZE = 5; // Process 5 counties at a time for daily updates

// California counties with FIPS codes
const PRIORITY_COUNTIES = [
  '06019', // Fresno
  '06029', // Kern  
  '06031', // Kings
  '06037', // Los Angeles
  '06039', // Madera
  '06047', // Merced
  '06053', // Monterey
  '06059', // Orange
  '06065', // Riverside
  '06067', // Sacramento
  '06071', // San Bernardino
  '06073', // San Diego
  '06077', // San Joaquin
  '06085', // Santa Clara
  '06099', // Stanislaus
  '06107', // Tulare
  '06111', // Ventura
  '06113'  // Yolo
];

const ALL_COUNTIES = [
  '06001', '06003', '06005', '06007', '06009', '06011', '06013', '06015', '06017', '06019',
  '06021', '06023', '06025', '06027', '06029', '06031', '06033', '06035', '06037', '06039',
  '06041', '06043', '06045', '06047', '06049', '06051', '06053', '06055', '06057', '06059',
  '06061', '06063', '06065', '06067', '06069', '06071', '06073', '06075', '06077', '06079',
  '06081', '06083', '06085', '06087', '06089', '06091', '06093', '06095', '06097', '06099',
  '06101', '06103', '06105', '06107', '06109', '06111', '06113', '06115'
];

const COUNTY_NAMES: { [key: string]: string } = {
  '06001': 'Alameda', '06003': 'Alpine', '06005': 'Amador', '06007': 'Butte', '06009': 'Calaveras',
  '06011': 'Colusa', '06013': 'Contra Costa', '06015': 'Del Norte', '06017': 'El Dorado', '06019': 'Fresno',
  '06021': 'Glenn', '06023': 'Humboldt', '06025': 'Imperial', '06027': 'Inyo', '06029': 'Kern',
  '06031': 'Kings', '06033': 'Lake', '06035': 'Lassen', '06037': 'Los Angeles', '06039': 'Madera',
  '06041': 'Marin', '06043': 'Mariposa', '06045': 'Mendocino', '06047': 'Merced', '06049': 'Modoc',
  '06051': 'Mono', '06053': 'Monterey', '06055': 'Napa', '06057': 'Nevada', '06059': 'Orange',
  '06061': 'Placer', '06063': 'Plumas', '06065': 'Riverside', '06067': 'Sacramento', '06069': 'San Benito',
  '06071': 'San Bernardino', '06073': 'San Diego', '06075': 'San Francisco', '06077': 'San Joaquin', '06079': 'San Luis Obispo',
  '06081': 'San Mateo', '06083': 'Santa Barbara', '06085': 'Santa Clara', '06087': 'Santa Cruz', '06089': 'Shasta',
  '06091': 'Sierra', '06093': 'Siskiyou', '06095': 'Solano', '06097': 'Sonoma', '06099': 'Stanislaus',
  '06101': 'Sutter', '06103': 'Tehama', '06105': 'Trinity', '06107': 'Tulare', '06109': 'Tuolumne',
  '06111': 'Ventura', '06113': 'Yolo', '06115': 'Yuba'
};

function getCountyName(code: string): string {
  return COUNTY_NAMES[code] || 'Unknown';
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }
      return response;
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed for ${url}:`, error.message);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('All retries failed');
}

function buildGWLevelsURL(countyCd: string, startDT?: string, endDT?: string): string {
  const baseUrl = 'https://waterservices.usgs.gov/nwis/gwlevels/';
  const params = new URLSearchParams({
    format: 'json',
    countyCd,
    indent: 'on',
    siteStatus: 'active',
    siteType: 'GW'
  });
  
  if (startDT) params.set('startDT', startDT);
  if (endDT) params.set('endDT', endDT);
  
  return `${baseUrl}?${params.toString()}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting California statewide daily groundwater data update...')

    const countyCodes = USE_PRIORITY_COUNTIES_ONLY ? PRIORITY_COUNTIES : ALL_COUNTIES
    console.log(`Processing ${countyCodes.length} counties (${USE_PRIORITY_COUNTIES_ONLY ? 'priority counties only' : 'all California counties'})...`)

    let totalRecords = 0
    let processedCounties = 0
    const startTime = new Date()

    // Process counties in batches
    for (let i = 0; i < countyCodes.length; i += COUNTY_BATCH_SIZE) {
      const batch = countyCodes.slice(i, i + COUNTY_BATCH_SIZE)
      console.log(`Processing county batch ${Math.floor(i/COUNTY_BATCH_SIZE) + 1}/${Math.ceil(countyCodes.length/COUNTY_BATCH_SIZE)}`)

      const batchPromises = batch.map(async (countyCode) => {
        const countyName = getCountyName(countyCode)
        console.log(`Processing ${countyName} County...`)

        try {
          // Get the start date based on latest data in database for this county
          const { data: latestData, error: latestError } = await supabaseClient
            .from('groundwater_time_series')
            .select('measurement_datetime')
            .eq('county_code', countyCode)
            .order('measurement_datetime', { ascending: false })
            .limit(1)

          if (latestError) {
            throw new Error(`Error getting latest date for ${countyName}: ${latestError.message}`)
          }

          let startDate: string
          if (latestData.length === 0) {
            // No data exists, start from 30 days ago
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            startDate = formatDate(thirtyDaysAgo)
          } else {
            // Start from latest date minus lookback period
            const latestDate = new Date(latestData[0].measurement_datetime)
            latestDate.setDate(latestDate.getDate() - LOOKBACK_DAYS)
            startDate = formatDate(latestDate)
          }

          const endDate = formatDate(new Date()) // Today
          console.log(`${countyName} County: Fetching data from ${startDate} to ${endDate}`)

          const url = buildGWLevelsURL(countyCode, startDate, endDate)
          const res = await fetchWithRetry(url)
          const data = await res.json()
          const seriesList = data?.value?.timeSeries ?? []

          if (seriesList.length === 0) {
            console.log(`${countyName} County: No new data found`)
            return { countyCode, countyName, recordCount: 0 }
          }

          // Process the time series data for this county
          const allRecords = []
          
          for (const series of seriesList) {
            const values = series?.values?.[0]?.value ?? []
            const variable = series.variable
            const site = series.sourceInfo
            const methodId = series.values?.[0]?.method?.[0]?.methodID ?? null

            const lat = site?.geoLocation?.geogLocation?.latitude ?? null
            const lon = site?.geoLocation?.geogLocation?.longitude ?? null
            const geometry = lat && lon ? `SRID=4326;POINT(${lon} ${lat})` : null
            const siteCode = site?.siteCode?.[0]?.value ?? null
            const agencyCode = site?.siteCode?.[0]?.agencyCode ?? null
            const siteName = site?.siteName ?? null

            const propsMap = Object.fromEntries((site.siteProperty || []).map((p: any) => [p.name, p.value]))

            for (const v of values) {
              const val = parseFloat(v.value)
              if (isNaN(val)) continue

              allRecords.push({
                monitoring_location_id: siteCode,
                site_name: siteName,
                agency_code: agencyCode,
                huc_code: propsMap.hucCd ?? null,
                state_code: propsMap.stateCd ?? null,
                county_code: propsMap.countyCd ?? null,
                latitude: lat,
                longitude: lon,
                geometry,
                variable_code: variable.variableCode?.[0]?.value ?? null,
                variable_name: variable.variableName ?? null,
                variable_description: variable.variableDescription ?? null,
                unit: variable.unit?.unitCode ?? null,
                variable_id: variable.variableCode?.[0]?.variableID ?? null,
                measurement_datetime: v.dateTime,
                measurement_value: val,
                qualifiers: v.qualifiers ?? [],
                method_id: methodId
              })
            }
          }

          if (allRecords.length === 0) {
            console.log(`${countyName} County: No valid records found`)
            return { countyCode, countyName, recordCount: 0 }
          }

          // Process in batches for better performance
          const batchSize = 500
          let countyTotal = 0

          for (let j = 0; j < allRecords.length; j += batchSize) {
            const recordBatch = allRecords.slice(j, j + batchSize)
            
            const { error } = await supabaseClient
              .from('groundwater_time_series')
              .upsert(recordBatch, {
                onConflict: 'monitoring_location_id,measurement_datetime,variable_code',
                ignoreDuplicates: false
              })
              
            if (error) {
              console.error(`${countyName} County upsert error:`, error.message)
              throw error
            }
            
            countyTotal += recordBatch.length
          }

          console.log(`${countyName} County complete: ${countyTotal} records processed`)
          return { countyCode, countyName, recordCount: countyTotal }

        } catch (error) {
          console.error(`Error processing ${countyName} County:`, error.message)
          return { countyCode, countyName, recordCount: 0, error: error.message }
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          totalRecords += result.value.recordCount
          processedCounties++
        } else {
          const countyName = getCountyName(batch[index])
          console.error(`Failed to process ${countyName} County`)
        }
      })

      // Add delay between batches to be respectful to USGS API
      if (i + COUNTY_BATCH_SIZE < countyCodes.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    const duration = (new Date().getTime() - startTime.getTime()) / 1000

    if (totalRecords === 0) {
      console.log('No new data found for any counties')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No new data found for any counties',
          recordsProcessed: 0,
          countiesProcessed: processedCounties
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`\n=== CALIFORNIA STATEWIDE DAILY UPDATE COMPLETE ===`)
    console.log(`Total counties processed: ${processedCounties}/${countyCodes.length}`)
    console.log(`Total records processed: ${totalRecords.toLocaleString()}`)
    console.log(`Total duration: ${duration.toFixed(1)} seconds`)

    // Log success to database for monitoring
    await supabaseClient.from('job_logs').insert({
      job_name: 'statewide_daily_groundwater_update',
      status: 'success',
      records_processed: totalRecords,
      counties_processed: processedCounties,
      duration_seconds: duration,
      completed_at: new Date().toISOString(),
      details: `Processed ${USE_PRIORITY_COUNTIES_ONLY ? 'priority' : 'all'} California counties`
    })

    console.log(`Statewide daily update complete: ${totalRecords} records processed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'California statewide daily update completed successfully',
        recordsProcessed: totalRecords,
        countiesProcessed: processedCounties,
        duration: `${duration.toFixed(1)}s`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Daily update error:', error.message)

    // Log failure to database for monitoring
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabaseClient.from('job_logs').insert({
        job_name: 'statewide_daily_groundwater_update',
        status: 'error',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
    } catch (logError) {
      console.warn('Failed to log error:', logError.message)
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/daily-groundwater-update' \
    --header 'Authorization: Bearer [YOUR_ANON_KEY]' \
    --header 'Content-Type: application/json' \
    --data '{}'

*/