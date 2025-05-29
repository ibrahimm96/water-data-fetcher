import { supabase } from './supabase.js';
import { formatDate, fetchWithRetry, buildGWLevelsURL, processCountyInBatches } from './utils.js';
import { getAllCountyCodes, getPriorityCountyCodes, getCountyName } from './california_counties.js';

// Configuration
const LOOKBACK_DAYS = 7; // Look back 7 days to catch any late-arriving data
const USE_PRIORITY_COUNTIES_ONLY = true; // Set to false to process all 58 counties daily
const COUNTY_BATCH_SIZE = 5; // Process 5 counties at a time for daily updates

async function getLatestDataDate(countyCode = null) {
  let query = supabase
    .from('groundwater_time_series')
    .select('measurement_datetime')
    .order('measurement_datetime', { ascending: false })
    .limit(1);
    
  if (countyCode) {
    query = query.eq('county_code', countyCode);
  }
  
  const { data, error } = await query;
    
  if (error) {
    console.error('Error getting latest date:', error.message);
    throw error;
  }
  
  if (data.length === 0) {
    // No data exists, start from 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return formatDate(thirtyDaysAgo);
  }
  
  // Start from latest date minus lookback period
  const latestDate = new Date(data[0].measurement_datetime);
  latestDate.setDate(latestDate.getDate() - LOOKBACK_DAYS);
  return formatDate(latestDate);
}

async function processTimeSeriesData(seriesList) {
  const allRecords = [];
  
  for (const series of seriesList) {
    const values = series?.values?.[0]?.value ?? [];
    const variable = series.variable;
    const site = series.sourceInfo;
    const methodId = series.values?.[0]?.method?.[0]?.methodID ?? null;

    const lat = site?.geoLocation?.geogLocation?.latitude ?? null;
    const lon = site?.geoLocation?.geogLocation?.longitude ?? null;
    const geometry = lat && lon ? `SRID=4326;POINT(${lon} ${lat})` : null;
    const siteCode = site?.siteCode?.[0]?.value ?? null;
    const agencyCode = site?.siteCode?.[0]?.agencyCode ?? null;
    const siteName = site?.siteName ?? null;

    const propsMap = Object.fromEntries((site.siteProperty || []).map(p => [p.name, p.value]));

    for (const v of values) {
      const val = parseFloat(v.value);
      if (isNaN(val)) continue;

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
      });
    }
  }
  
  return allRecords;
}

async function fetchCountyDailyUpdate(countyCode) {
  const countyName = getCountyName(countyCode);
  console.log(`Processing ${countyName} County daily update...`);
  
  // Get the start date based on latest data in database for this county
  const startDate = await getLatestDataDate(countyCode);
  const endDate = formatDate(new Date()); // Today
  
  console.log(`${countyName} County: Fetching data from ${startDate} to ${endDate}...`);
  
  const url = buildGWLevelsURL(countyCode, startDate, endDate);
  
  try {
    const res = await fetchWithRetry(url);
    const data = await res.json();
    const seriesList = data?.value?.timeSeries ?? [];
    
    if (seriesList.length === 0) {
      console.log(`${countyName} County: No new data found for daily update`);
      return { countyCode, countyName, recordCount: 0 };
    }
    
    const records = await processTimeSeriesData(seriesList);
    
    if (records.length === 0) {
      console.log(`${countyName} County: No valid records found for daily update`);
      return { countyCode, countyName, recordCount: 0 };
    }
    
    console.log(`${countyName} County: Processing ${records.length} records...`);
    
    // Process in batches for better performance
    const batchSize = 500;
    let totalProcessed = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('groundwater_time_series')
        .upsert(batch, {
          onConflict: 'monitoring_location_id,measurement_datetime,variable_code',
          ignoreDuplicates: false
        });
        
      if (error) {
        console.error(`${countyName} County upsert error:`, error.message);
        throw error;
      }
      
      totalProcessed += batch.length;
      console.log(`${countyName} County: Processed ${totalProcessed}/${records.length} records`);
    }
    
    console.log(`${countyName} County daily update complete: ${totalProcessed} records processed`);
    return { countyCode, countyName, recordCount: totalProcessed };
    
  } catch (error) {
    console.error(`Error in ${countyName} County daily update:`, error.message);
    throw error;
  }
}

async function fetchStatewideDaily() {
  console.log('Starting California statewide daily groundwater data update...');
  
  const countyCodes = USE_PRIORITY_COUNTIES_ONLY ? getPriorityCountyCodes() : getAllCountyCodes();
  console.log(`Processing ${countyCodes.length} counties (${USE_PRIORITY_COUNTIES_ONLY ? 'priority counties only' : 'all California counties'})...`);
  
  const startTime = new Date();
  let totalRecords = 0;
  
  // Process counties in batches to manage API load
  const results = await processCountyInBatches(
    countyCodes, 
    fetchCountyDailyUpdate, 
    COUNTY_BATCH_SIZE
  );
  
  // Summarize results
  results.forEach(result => {
    if (result && result.recordCount) {
      totalRecords += result.recordCount;
    }
  });
  
  const duration = (new Date() - startTime) / 1000; // seconds
  
  console.log(`\n=== CALIFORNIA STATEWIDE DAILY UPDATE COMPLETE ===`);
  console.log(`Total counties processed: ${results.length}/${countyCodes.length}`);
  console.log(`Total records processed: ${totalRecords.toLocaleString()}`);
  console.log(`Total duration: ${duration.toFixed(1)} seconds`);
  
  return totalRecords;
}

// Add monitoring and error reporting
async function runStatewideUpdateWithMonitoring() {
  const startTime = new Date();
  
  try {
    const recordCount = await fetchStatewideDaily();
    const duration = (new Date() - startTime) / 1000;
    
    console.log(`✓ Statewide daily update successful: ${recordCount} records in ${duration}s`);
    
    // Log success to database for monitoring
    await supabase.from('job_logs').insert({
      job_name: 'statewide_daily_groundwater_update',
      status: 'success',
      records_processed: recordCount,
      duration_seconds: duration,
      completed_at: new Date().toISOString(),
      details: `Processed ${USE_PRIORITY_COUNTIES_ONLY ? 'priority' : 'all'} California counties`
    }).catch(err => console.warn('Failed to log success:', err.message));
    
    return recordCount;
    
  } catch (error) {
    const duration = (new Date() - startTime) / 1000;
    
    console.error(`✗ Statewide daily update failed after ${duration}s:`, error.message);
    
    // Log failure to database for monitoring
    await supabase.from('job_logs').insert({
      job_name: 'statewide_daily_groundwater_update',
      status: 'error',
      error_message: error.message,
      duration_seconds: duration,
      completed_at: new Date().toISOString()
    }).catch(err => console.warn('Failed to log error:', err.message));
    
    throw error;
  }
}

// Run the daily update
if (import.meta.url === `file://${process.argv[1]}`) {
  runStatewideUpdateWithMonitoring().catch(err => {
    console.error('Statewide daily update error:', err.message);
    process.exit(1);
  });
}

export { fetchCountyDailyUpdate, fetchStatewideDaily, runStatewideUpdateWithMonitoring };