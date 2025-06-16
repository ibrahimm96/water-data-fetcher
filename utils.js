// Shared utility functions for groundwater data fetching
import fetch from 'node-fetch';

export function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export function getDateRanges(startDate, endDate, chunkMonths = 12) {
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

export async function fetchWithRetry(url, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempt ${i + 1}/${maxRetries} for ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }
      return response;
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed for ${url}:`, error.message);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}

export function buildGWLevelsURL(countyCd, startDT = null, endDT = null) {
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

export function buildSitesURL(countyCd) {
  const baseUrl = 'https://api.waterdata.usgs.gov/ogcapi/v0/collections/monitoring-locations/items';
  const params = new URLSearchParams({
    'f': 'json',
    'lang': 'en-US',
    'limit': '10000',
    'skipGeometry': 'false',
    'offset': '0',
    'state_code': '06',
    'county_code': countyCd.slice(-3), // Remove '06' prefix for sites API
    'site_type_code': 'GW'
  });
  
  return `${baseUrl}?${params.toString()}`;
}

export async function processCountyInBatches(counties, processFn, batchSize = 5) {
  const results = [];
  
  for (let i = 0; i < counties.length; i += batchSize) {
    const batch = counties.slice(i, i + batchSize);
    console.log(`Processing county batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(counties.length/batchSize)}: ${batch.map(c => c.name || c).join(', ')}`);
    
    const batchPromises = batch.map(county => processFn(county));
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        const countyName = batch[index].name || batch[index];
        console.error(`Failed to process county ${countyName}:`, result.reason.message);
      }
    });
    
    // Add delay between batches to be respectful to USGS API
    if (i + batchSize < counties.length) {
      console.log(`Waiting 10 seconds before next county...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  return results;
}

export async function upsertTimeSeriesData(supabase, timeSeriesData) {
  const { data, error } = await supabase
    .from('groundwater_time_series')
    .upsert(timeSeriesData, {
      onConflict: 'monitoring_location_number,measurement_datetime,variable_code',
      ignoreDuplicates: true
    });
    
  if (error) {
    console.error('Upsert error:', error.message);
    throw error;
  }
  
  return data;
}

export async function upsertHistoricalTimeSeriesData(supabase, timeSeriesData) {
  // Get current count before insert
  const { count: beforeCount } = await supabase
    .from('gw_historical_timeseries')
    .select('*', { count: 'exact', head: true });
    
  const { data, error } = await supabase
    .from('gw_historical_timeseries')
    .upsert(timeSeriesData, {
      onConflict: 'monitoring_location_number,measurement_datetime,variable_code',
      ignoreDuplicates: true
    });
    
  if (error) {
    console.error('Historical upsert error:', error.message);
    throw error;
  }
  
  // Get count after insert to show actual new records
  const { count: afterCount } = await supabase
    .from('gw_historical_timeseries')
    .select('*', { count: 'exact', head: true });
    
  const actualInserted = (afterCount || 0) - (beforeCount || 0);
  
  return { 
    data, 
    attempted: timeSeriesData.length, 
    actuallyInserted: actualInserted 
  };
}