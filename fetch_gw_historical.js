import { supabase } from './supabase.js';
import { upsertHistoricalTimeSeriesData, fetchWithRetry, buildGWLevelsURL, processCountyInBatches } from './utils.js';
import { CALIFORNIA_COUNTIES, getAllCountyCodes } from './california_counties.js';

// Parse command line arguments for specific counties
const args = process.argv.slice(2);
const targetCounties = args.length > 0 ? args : getAllCountyCodes();

console.log(`Fetching historical groundwater data for ${targetCounties.length} counties...`);

async function fetchCountyHistoricalData(countyCd) {
  const countyName = CALIFORNIA_COUNTIES.find(c => c.code === countyCd)?.name || countyCd;
  console.log(`\nProcessing ${countyName} County (${countyCd})...`);
  
  try {
    // First try to fetch all data at once
    const fullResult = await fetchCountyDataRange(countyCd, countyName);
    if (fullResult.success) {
      return fullResult.recordCount;
    }
    
    // If full fetch fails, try date-based batching
    console.log(`📅 Full fetch failed for ${countyName}, trying date-based batching...`);
    return await fetchCountyWithDateBatching(countyCd, countyName);
    
  } catch (error) {
    console.error(`❌ Error processing ${countyName} County:`, error.message);
    return 0;
  }
}

async function fetchCountyDataRange(countyCd, countyName, startDate = null, endDate = null) {
  try {
    const url = buildGWLevelsURL(countyCd, startDate, endDate);
    const dateRange = startDate && endDate ? ` (${startDate} to ${endDate})` : '';
    console.log(`Fetching ${countyName}${dateRange}...`);
    
    const res = await fetchWithRetry(url, 2, 3000); // Reduced retries for batching
    const data = await res.json();
    const seriesList = data?.value?.timeSeries ?? [];
    
    if (seriesList.length === 0) {
      return { success: true, recordCount: 0 };
    }
    
    const allRecords = [];
    
    for (const series of seriesList) {
      const values = series?.values?.[0]?.value ?? [];
      const variable = series.variable;
      const site = series.sourceInfo;
      const methodId = series.values?.[0]?.method?.[0]?.methodID ?? null;
      
      const lat = site?.geoLocation?.geogLocation?.latitude ?? null;
      const lon = site?.geoLocation?.geogLocation?.longitude ?? null;
      const siteCode = site?.siteCode?.[0]?.value ?? null;
      const agencyCode = site?.siteCode?.[0]?.agencyCode ?? null;
      const siteName = site?.siteName ?? null;
      
      const propsMap = Object.fromEntries((site.siteProperty || []).map(p => [p.name, p.value]));
      
      for (const v of values) {
        const val = parseFloat(v.value);
        if (isNaN(val)) continue;
        
        allRecords.push({
          monitoring_location_number: siteCode,
          site_name: siteName,
          agency_code: agencyCode,
          huc_code: propsMap.hucCd ?? null,
          state_code: propsMap.stateCd ?? null,
          county_code: propsMap.countyCd ?? null,
          latitude: lat,
          longitude: lon,
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
    
    if (allRecords.length > 0) {
      const result = await upsertHistoricalTimeSeriesData(supabase, allRecords);
      const message = dateRange ? 
        `  📊 ${startDate}-${endDate}: ${result.actuallyInserted} new records (${result.attempted} attempted)` :
        `✅ ${countyName} County: ${result.actuallyInserted} new records inserted (${result.attempted} attempted, ${result.attempted - result.actuallyInserted} duplicates skipped)`;
      console.log(message);
      return { success: true, recordCount: result.actuallyInserted };
    } else {
      return { success: true, recordCount: 0 };
    }
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function fetchCountyWithDateBatching(countyCd, countyName) {
  const startYear = 1900; // USGS data typically starts around early 1900s
  const currentYear = new Date().getFullYear();
  const yearsPerBatch = 5; // Fetch 5 years at a time
  
  let totalRecords = 0;
  let successfulBatches = 0;
  let failedBatches = 0;
  
  for (let year = startYear; year <= currentYear; year += yearsPerBatch) {
    const endYear = Math.min(year + yearsPerBatch - 1, currentYear);
    const startDate = `${year}-01-01`;
    const endDate = `${endYear}-12-31`;
    
    try {
      const result = await fetchCountyDataRange(countyCd, countyName, startDate, endDate);
      if (result.success) {
        totalRecords += result.recordCount;
        successfulBatches++;
        
        // Add small delay between date batches
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.warn(`  ❌ Failed batch ${startDate}-${endDate}: ${result.error}`);
        failedBatches++;
      }
    } catch (error) {
      console.warn(`  ❌ Failed batch ${startDate}-${endDate}: ${error.message}`);
      failedBatches++;
    }
  }
  
  console.log(`✅ ${countyName} County completed: ${totalRecords} total records from ${successfulBatches} successful batches (${failedBatches} failed)`);
  return totalRecords;
}

async function fetchAllCountiesHistoricalData() {
  console.log('Starting comprehensive historical groundwater data fetch...');
  console.log(`Target counties: ${targetCounties.length}`);
  
  const counties = targetCounties.map(code => {
    const county = CALIFORNIA_COUNTIES.find(c => c.code === code);
    return county || { code, name: 'Unknown' };
  });
  
  let totalRecords = 0;
  let successCount = 0;
  
  // Process counties in smaller batches to manage API load
  await processCountyInBatches(counties, async (county) => {
    const recordCount = await fetchCountyHistoricalData(county.code);
    if (recordCount > 0) {
      successCount++;
      totalRecords += recordCount;
    }
    return recordCount;
  }, 1); // Process one county at a time to avoid overwhelming API
  
  console.log('\n🎉 Historical data fetch completed!');
  console.log(`Counties processed: ${counties.length}`);
  console.log(`Counties with data: ${successCount}`);
  console.log(`Total records inserted: ${totalRecords}`);
}

fetchAllCountiesHistoricalData().catch(err => {
  console.error('❌ Fatal error during historical data fetch:', err.message);
  process.exit(1);
});
