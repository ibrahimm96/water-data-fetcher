import { supabase } from './supabase.js';
import { buildSitesURL, buildGWLevelsURL, fetchWithRetry, processCountyInBatches } from './utils.js';
import californiaCounties from './california_counties.js';

/**
 * County-based Groundwater Site Fetcher
 * 
 * This script fetches groundwater monitoring sites filtered by:
 * - siteType=GW (groundwater)
 * - county code (FIPS codes)
 * 
 * Data is stored in the groundwater_sites_by_county table for efficient
 * county-based queries and analysis.
 */

// Configuration
const BATCH_SIZE = 5; // Counties to process in parallel
const RATE_LIMIT_DELAY = 2000; // 2 seconds between county batches
const MAX_RETRIES = 3;

/**
 * Process groundwater sites data from USGS API response
 */
function processSitesData(jsonData, countyCd) {
  const sites = [];
  
  if (!jsonData.features) {
    console.warn(`No features found for county ${countyCd}`);
    return sites;
  }
  
  for (const feature of jsonData.features) {
    const props = feature.properties;
    const geometry = feature.geometry;
    
    // Extract coordinates
    const [longitude, latitude, altitude] = geometry?.coordinates || [null, null, null];
    
    if (!props.monitoringLocationNumber) {
      console.warn('Site missing monitoring location number, skipping');
      continue;
    }
    
    const siteData = {
      monitoring_location_id: props.monitoringLocationNumber,
      site_name: props.monitoringLocationName,
      agency_code: props.agencyCode || 'USGS',
      site_type_code: props.monitoringLocationTypeName || 'GW',
      
      // Location information
      county_code: countyCd,
      county_name: getCountyName(countyCd),
      state_code: '06', // California
      huc_code: props.hucCode,
      latitude: latitude,
      longitude: longitude,
      altitude: altitude,
      altitude_datum: props.altitudeDatumName,
      
      // Site characteristics
      aquifer_code: props.aquiferCode,
      aquifer_name: props.aquiferName,
      well_depth_ft: props.wellDepth ? parseFloat(props.wellDepth) : null,
      
      // Initialize measurement counts (will be updated separately)
      total_measurements: 0,
      earliest_measurement: null,
      latest_measurement: null
    };
    
    // Create PostGIS point geometry if coordinates are available
    if (longitude && latitude) {
      siteData.location = `POINT(${longitude} ${latitude})`;
    }
    
    sites.push(siteData);
  }
  
  return sites;
}

/**
 * Get county name from county code
 */
function getCountyName(countyCd) {
  const county = californiaCounties.find(c => c.code === countyCd);
  return county ? county.name : null;
}

/**
 * Fetch sites for a specific county
 */
async function fetchCountySites(county) {
  const countyCd = typeof county === 'string' ? county : county.code;
  const countyName = typeof county === 'string' ? getCountyName(county) : county.name;
  
  console.log(`\nFetching groundwater sites for ${countyName} (${countyCd})...`);
  
  try {
    // Build URL using existing utility function
    const sitesUrl = buildSitesURL(countyCd);
    console.log(`  API URL: ${sitesUrl}`);
    
    // Fetch sites data
    const response = await fetchWithRetry(sitesUrl, MAX_RETRIES);
    const jsonData = await response.json();
    
    // Process sites data
    const sites = processSitesData(jsonData, countyCd);
    console.log(`  Found ${sites.length} groundwater sites`);
    
    if (sites.length === 0) {
      return { county: countyName, sitesProcessed: 0, sitesInserted: 0 };
    }
    
    // Insert sites into database
    const insertedCount = await insertSitesData(sites);
    
    console.log(`  ✓ Inserted ${insertedCount}/${sites.length} sites for ${countyName}`);
    
    return {
      county: countyName,
      sitesProcessed: sites.length,
      sitesInserted: insertedCount
    };
    
  } catch (error) {
    console.error(`  ✗ Failed to process ${countyName}:`, error.message);
    return {
      county: countyName,
      sitesProcessed: 0,
      sitesInserted: 0,
      error: error.message
    };
  }
}

/**
 * Insert sites data into Supabase
 */
async function insertSitesData(sites) {
  if (sites.length === 0) return 0;
  
  try {
    // Use upsert to handle potential duplicates
    const { data, error } = await supabase
      .from('groundwater_sites_by_county')
      .upsert(sites, {
        onConflict: 'monitoring_location_id,county_code',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('Database insert error:', error.message);
      throw error;
    }
    
    return sites.length;
    
  } catch (error) {
    console.error('Failed to insert sites data:', error.message);
    throw error;
  }
}

/**
 * Update measurement counts for existing sites
 */
async function updateMeasurementCounts() {
  console.log('\nUpdating measurement counts for sites...');
  
  try {
    // Update measurement counts using a SQL query that joins with the time series table
    const { error } = await supabase.rpc('update_site_measurement_counts');
    
    if (error) {
      console.error('Failed to update measurement counts:', error.message);
    } else {
      console.log('✓ Successfully updated measurement counts');
    }
    
  } catch (error) {
    console.error('Error updating measurement counts:', error.message);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('=== County-based Groundwater Sites Fetcher ===');
  console.log(`Processing ${californiaCounties.length} California counties`);
  console.log(`Batch size: ${BATCH_SIZE} counties per batch`);
  console.log(`Rate limit: ${RATE_LIMIT_DELAY}ms between batches`);
  
  try {
    // Process counties in batches
    const results = await processCountyInBatches(
      californiaCounties,
      fetchCountySites,
      BATCH_SIZE
    );
    
    // Calculate summary statistics
    const totalSitesProcessed = results.reduce((sum, r) => sum + r.sitesProcessed, 0);
    const totalSitesInserted = results.reduce((sum, r) => sum + r.sitesInserted, 0);
    const successfulCounties = results.filter(r => !r.error).length;
    const failedCounties = results.filter(r => r.error).length;
    
    console.log('\n=== SUMMARY ===');
    console.log(`Counties processed: ${successfulCounties}/${californiaCounties.length}`);
    console.log(`Counties failed: ${failedCounties}`);
    console.log(`Total sites found: ${totalSitesProcessed}`);
    console.log(`Total sites inserted: ${totalSitesInserted}`);
    console.log(`Success rate: ${((totalSitesInserted/totalSitesProcessed) * 100).toFixed(1)}%`);
    
    // Update measurement counts if sites were inserted
    if (totalSitesInserted > 0) {
      await updateMeasurementCounts();
    }
    
    // Show failed counties if any
    if (failedCounties > 0) {
      console.log('\n=== FAILED COUNTIES ===');
      results.filter(r => r.error).forEach(r => {
        console.log(`${r.county}: ${r.error}`);
      });
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Process specific counties (for testing or selective updates)
 */
async function processSpecificCounties(countyCodes) {
  console.log(`Processing specific counties: ${countyCodes.join(', ')}`);
  
  const selectedCounties = californiaCounties.filter(county => 
    countyCodes.includes(county.code)
  );
  
  if (selectedCounties.length === 0) {
    console.error('No matching counties found');
    return;
  }
  
  const results = await processCountyInBatches(
    selectedCounties,
    fetchCountySites,
    BATCH_SIZE
  );
  
  results.forEach(result => {
    console.log(`${result.county}: ${result.sitesInserted} sites inserted`);
  });
}

// Handle command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Process specific counties if provided
    await processSpecificCounties(args);
  } else {
    // Process all counties
    await main();
  }
}

export { fetchCountySites, processSpecificCounties, updateMeasurementCounts };