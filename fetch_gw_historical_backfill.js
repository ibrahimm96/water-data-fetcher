import { supabase } from './supabase.js';
import { getDateRanges, fetchWithRetry, buildGWLevelsURL, upsertTimeSeriesData, processCountyInBatches } from './utils.js';
import { CALIFORNIA_COUNTIES, getAllCountyCodes, getPriorityCountyCodes, getCountyName } from './california_counties.js';

// Configuration
const START_DATE = '2000-01-01'; // Adjust as needed
const END_DATE = new Date().toISOString().split('T')[0]; // Today
const CHUNK_MONTHS = 12; // Process 1 year at a time
const USE_PRIORITY_COUNTIES_ONLY = false; // Set to true to only process high-priority counties
const COUNTY_BATCH_SIZE = 3; // Process 3 counties at a time

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

async function fetchAndInsertDateRange(countyCode, startDate, endDate) {
  const countyName = getCountyName(countyCode);
  console.log(`Fetching ${countyName} County data from ${startDate} to ${endDate}...`);
  
  const url = buildGWLevelsURL(countyCode, startDate, endDate);
  
  try {
    const res = await fetchWithRetry(url);
    const data = await res.json();
    const seriesList = data?.value?.timeSeries ?? [];
    
    if (seriesList.length === 0) {
      console.log(`No data found for ${countyName} County ${startDate} to ${endDate}`);
      return 0;
    }
    
    const records = await processTimeSeriesData(seriesList);
    
    if (records.length === 0) {
      console.log(`No valid records for ${countyName} County ${startDate} to ${endDate}`);
      return 0;
    }
    
    // Process in batches to avoid memory issues
    const batchSize = 1000;
    let totalInserted = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await upsertTimeSeriesData(supabase, batch);
      totalInserted += batch.length;
      console.log(`Processed ${totalInserted}/${records.length} records for ${countyName} County ${startDate} to ${endDate}`);
    }
    
    return totalInserted;
    
  } catch (error) {
    console.error(`Error processing ${countyName} County ${startDate} to ${endDate}:`, error.message);
    throw error;
  }
}

async function processCountyBackfill(countyCode) {
  const countyName = getCountyName(countyCode);
  console.log(`\n=== Starting backfill for ${countyName} County (${countyCode}) ===`);
  
  const dateRanges = getDateRanges(new Date(START_DATE), new Date(END_DATE), CHUNK_MONTHS);
  let countyTotal = 0;
  
  for (let i = 0; i < dateRanges.length; i++) {
    const range = dateRanges[i];
    console.log(`${countyName} County - Range ${i + 1}/${dateRanges.length}: ${range.start} to ${range.end}`);
    
    try {
      const recordCount = await fetchAndInsertDateRange(countyCode, range.start, range.end);
      countyTotal += recordCount;
      console.log(`${countyName} County - Range complete: ${recordCount} records inserted`);
      
      // Add delay to be respectful to USGS API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Failed to process ${countyName} County range ${range.start} to ${range.end}:`, error.message);
      // Continue with next range instead of failing completely
    }
  }
  
  console.log(`${countyName} County backfill complete: ${countyTotal} total records`);
  return { countyCode, countyName, recordCount: countyTotal };
}

async function backfillHistoricalData() {
  console.log(`Starting California statewide historical backfill from ${START_DATE} to ${END_DATE}`);
  
  const countyCodes = USE_PRIORITY_COUNTIES_ONLY ? getPriorityCountyCodes() : getAllCountyCodes();
  console.log(`Processing ${countyCodes.length} counties (${USE_PRIORITY_COUNTIES_ONLY ? 'priority counties only' : 'all California counties'})...`);
  
  const startTime = new Date();
  let totalRecords = 0;
  
  // Process counties in batches to manage API load
  const results = await processCountyInBatches(
    countyCodes, 
    processCountyBackfill, 
    COUNTY_BATCH_SIZE
  );
  
  // Summarize results
  results.forEach(result => {
    if (result && result.recordCount) {
      totalRecords += result.recordCount;
    }
  });
  
  const duration = (new Date() - startTime) / 1000 / 60; // minutes
  
  console.log(`\n=== CALIFORNIA STATEWIDE BACKFILL COMPLETE ===`);
  console.log(`Total counties processed: ${results.length}/${countyCodes.length}`);
  console.log(`Total records processed: ${totalRecords.toLocaleString()}`);
  console.log(`Total duration: ${duration.toFixed(1)} minutes`);
  
  // Log summary to database
  try {
    await supabase.from('job_logs').insert({
      job_name: 'statewide_historical_backfill',
      status: 'success',
      records_processed: totalRecords,
      counties_processed: results.length,
      duration_minutes: Math.round(duration),
      completed_at: new Date().toISOString(),
      details: `Processed ${results.length} counties with ${totalRecords} total records`
    });
  } catch (logError) {
    console.warn('Failed to log completion:', logError.message);
  }
}

// Run the backfill
if (import.meta.url === `file://${process.argv[1]}`) {
  backfillHistoricalData().catch(err => {
    console.error('Backfill error:', err.message);
    process.exit(1);
  });
}