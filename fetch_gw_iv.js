import { supabase } from './supabase.js';
import { fetchWithRetry, formatDate } from './utils.js';

// Configuration
const PARAMETER_CODE = '72019'; // Groundwater level below land surface, feet
const START_DATE = '2007-10-01'; // Maximum range start
const BATCH_SIZE = 10; // Sites per batch (USGS allows up to 100 sites per request)
const CONCURRENT_REQUESTS = 3; // Number of concurrent API requests
const RATE_LIMIT_DELAY = 1000; // 1 second between batches to respect rate limits
const CHUNK_MONTHS = 6; // Process data in 6-month chunks to manage response size

/**
 * Get all monitoring sites from database
 */
async function getAllSites() {
  console.log('Fetching all monitoring sites from database...');
  
  const { data: sites, error } = await supabase
    .from('groundwater_monitoring_sites')
    .select('monitoring_location_id, monitoring_location_name, state_code, county_code')
    .order('monitoring_location_id');
  
  if (error) {
    throw new Error(`Failed to fetch sites: ${error.message}`);
  }
  
  console.log(`Found ${sites.length} sites to process`);
  return sites;
}

/**
 * Build instantaneous values URL for multiple sites
 */
function buildIVURL(siteNumbers, startDT, endDT) {
  const sitesParam = siteNumbers.join(',');
  const url = `https://waterservices.usgs.gov/nwis/iv/?sites=${sitesParam}&parameterCd=${PARAMETER_CODE}&startDT=${startDT}&endDT=${endDT}&format=json`;
  return url;
}

/**
 * Get date ranges for chunked processing
 */
function getDateRanges(startDate, endDate, chunkMonths = 6) {
  const ranges = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current < end) {
    const rangeEnd = new Date(current);
    rangeEnd.setMonth(rangeEnd.getMonth() + chunkMonths);
    
    if (rangeEnd > end) {
      rangeEnd.setTime(end.getTime());
    }
    
    ranges.push({
      start: formatDate(current),
      end: formatDate(rangeEnd)
    });
    
    current.setMonth(current.getMonth() + chunkMonths);
  }
  
  return ranges;
}

/**
 * Process time series data and prepare for database insertion
 */
function processTimeSeriesData(jsonData) {
  const records = [];
  
  if (!jsonData.value?.timeSeries) {
    return records;
  }
  
  for (const timeSeries of jsonData.value.timeSeries) {
    const sourceInfo = timeSeries.sourceInfo;
    const variable = timeSeries.variable;
    const values = timeSeries.values?.[0]?.value || [];
    
    // Extract site information
    const siteInfo = {
      monitoring_location_id: sourceInfo.siteCode?.[0]?.value,
      site_name: sourceInfo.siteName,
      agency_code: sourceInfo.siteCode?.[0]?.agencyCode,
      huc_code: sourceInfo.siteProperty?.find(p => p.name === 'hucCd')?.value,
      state_code: sourceInfo.geoLocation?.geogLocation?.countryCode?.countryCode === 'US' ? 
        sourceInfo.geoLocation?.geogLocation?.stateCode : null,
      county_code: sourceInfo.geoLocation?.geogLocation?.countyCode,
      latitude: parseFloat(sourceInfo.geoLocation?.geogLocation?.latitude),
      longitude: parseFloat(sourceInfo.geoLocation?.geogLocation?.longitude),
      variable_code: variable.variableCode?.[0]?.value,
      variable_name: variable.variableName,
      variable_description: variable.variableDescription,
      unit: variable.unit?.unitCode
    };
    
    // Process each measurement
    for (const measurement of values) {
      if (measurement.value && measurement.value !== '' && !isNaN(parseFloat(measurement.value))) {
        records.push({
          ...siteInfo,
          measurement_datetime: measurement.dateTime,
          measurement_value: parseFloat(measurement.value),
          qualifiers: measurement.qualifiers?.map(q => q.qualifierCode) || null,
          method_id: parseInt(measurement.methodID) || null
        });
      }
    }
  }
  
  return records;
}

/**
 * Insert time series data to database
 */
async function insertTimeSeriesData(records) {
  if (records.length === 0) return 0;
  
  // Insert in batches to avoid payload size limits
  const insertBatchSize = 1000;
  let totalInserted = 0;
  
  for (let i = 0; i < records.length; i += insertBatchSize) {
    const batch = records.slice(i, i + insertBatchSize);
    
    const { error } = await supabase
      .from('groundwater_time_series')
      .insert(batch);
    
    if (error) {
      console.error(`Failed to insert batch ${Math.floor(i/insertBatchSize) + 1}:`, error.message);
      // Continue with next batch rather than failing completely
    } else {
      totalInserted += batch.length;
    }
  }
  
  return totalInserted;
}

/**
 * Process a batch of sites for a specific date range
 */
async function processSiteBatch(siteBatch, startDT, endDT) {
  const siteNumbers = siteBatch.map(site => site.monitoring_location_id);
  const url = buildIVURL(siteNumbers, startDT, endDT);
  
  try {
    console.log(`  Fetching IV data for ${siteNumbers.length} sites (${startDT} to ${endDT})...`);
    
    const response = await fetchWithRetry(url);
    const jsonData = await response.json();
    
    const records = processTimeSeriesData(jsonData);
    const insertedCount = await insertTimeSeriesData(records);
    
    console.log(`    Processed ${records.length} measurements, inserted ${insertedCount}`);
    return { processed: records.length, inserted: insertedCount };
    
  } catch (error) {
    console.error(`Failed to process batch for ${startDT}-${endDT}:`, error.message);
    return { processed: 0, inserted: 0, error: error.message };
  }
}

/**
 * Process all sites with rate limiting and progress tracking
 */
async function processAllSites() {
  const sites = await getAllSites();
  const endDate = new Date().toISOString().split('T')[0]; // Today
  const dateRanges = getDateRanges(START_DATE, endDate, CHUNK_MONTHS);
  
  console.log(`Processing ${sites.length} sites across ${dateRanges.length} date ranges`);
  console.log(`Date ranges: ${dateRanges[0].start} to ${dateRanges[dateRanges.length-1].end}`);
  
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalBatches = 0;
  
  // Process each date range
  for (let rangeIndex = 0; rangeIndex < dateRanges.length; rangeIndex++) {
    const { start, end } = dateRanges[rangeIndex];
    console.log(`\nProcessing date range ${rangeIndex + 1}/${dateRanges.length}: ${start} to ${end}`);
    
    // Split sites into batches
    const siteBatches = [];
    for (let i = 0; i < sites.length; i += BATCH_SIZE) {
      siteBatches.push(sites.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`  Processing ${siteBatches.length} batches of up to ${BATCH_SIZE} sites each`);
    
    // Process batches with concurrency control
    for (let i = 0; i < siteBatches.length; i += CONCURRENT_REQUESTS) {
      const concurrentBatches = siteBatches.slice(i, i + CONCURRENT_REQUESTS);
      
      // Process concurrent batches
      const promises = concurrentBatches.map(batch => 
        processSiteBatch(batch, start, end)
      );
      
      const results = await Promise.all(promises);
      
      // Aggregate results
      for (const result of results) {
        totalProcessed += result.processed;
        totalInserted += result.inserted;
        totalBatches++;
      }
      
      // Progress update
      const progress = ((i + CONCURRENT_REQUESTS) / siteBatches.length * 100).toFixed(1);
      console.log(`    Progress: ${progress}% (${totalInserted} records inserted)`);
      
      // Rate limiting delay
      if (i + CONCURRENT_REQUESTS < siteBatches.length) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }
  }
  
  console.log(`\n=== FINAL SUMMARY ===`);
  console.log(`Total batches processed: ${totalBatches}`);
  console.log(`Total measurements processed: ${totalProcessed}`);
  console.log(`Total measurements inserted: ${totalInserted}`);
  console.log(`Success rate: ${((totalInserted/totalProcessed) * 100).toFixed(2)}%`);
}

/**
 * Resume processing from a specific date (for interrupted runs)
 */
async function resumeFromDate(resumeDate) {
  console.log(`Resuming processing from ${resumeDate}`);
  
  // Get the most recent measurement date for progress estimation
  const { data: latestRecord } = await supabase
    .from('groundwater_time_series')
    .select('measurement_datetime')
    .order('measurement_datetime', { ascending: false })
    .limit(1);
  
  if (latestRecord && latestRecord.length > 0) {
    console.log(`Latest measurement in database: ${latestRecord[0].measurement_datetime}`);
  }
  
  // Override START_DATE and run
  const originalStart = START_DATE;
  Object.defineProperty(globalThis, 'START_DATE', { value: resumeDate, writable: true });
  
  try {
    await processAllSites();
  } finally {
    Object.defineProperty(globalThis, 'START_DATE', { value: originalStart, writable: true });
  }
}

// Main execution
async function main() {
  try {
    console.log('=== USGS Instantaneous Values Data Fetcher ===');
    console.log(`Parameter: ${PARAMETER_CODE} (Groundwater level below land surface)`);
    console.log(`Date range: ${START_DATE} to present`);
    console.log(`Batch size: ${BATCH_SIZE} sites per request`);
    console.log(`Concurrent requests: ${CONCURRENT_REQUESTS}`);
    console.log(`Rate limit delay: ${RATE_LIMIT_DELAY}ms between batches`);
    
    // Check if resuming from command line argument
    const resumeDate = process.argv[2];
    if (resumeDate) {
      await resumeFromDate(resumeDate);
    } else {
      await processAllSites();
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { processAllSites, resumeFromDate };