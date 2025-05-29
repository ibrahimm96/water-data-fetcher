import fetch from 'node-fetch';
import { supabase } from './supabase.js';
import { buildSitesURL, processCountyInBatches, fetchWithRetry } from './utils.js';
import { getAllCountyCodes, getPriorityCountyCodes, getCountyName } from './california_counties.js';

// Configuration
const USE_PRIORITY_COUNTIES_ONLY = false; // Set to true to only process high-priority counties
const COUNTY_BATCH_SIZE = 5; // Process 5 counties at a time

async function fetchAndInsertCountySites(countyCode) {
  const countyName = getCountyName(countyCode);
  console.log(`Processing ${countyName} County monitoring sites...`);
  
  const siteUrl = buildSitesURL(countyCode);
  
  try {
    const res = await fetchWithRetry(siteUrl);
    const data = await res.json();
    const features = data.features ?? [];

    const validSites = features.filter(item => {
      const g = item.geometry;
      return item.id && g?.coordinates?.length === 2;
    });

    if (validSites.length === 0) {
      console.log(`${countyName} County: No valid groundwater monitoring sites found`);
      return { countyCode, countyName, siteCount: 0 };
    }

    // Process sites in batches for better performance
    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < validSites.length; i += batchSize) {
      const batch = validSites.slice(i, i + batchSize);
      const siteRecords = batch.map(site => {
        const p = site.properties;
        const c = site.geometry.coordinates;

        return {
          monitoring_location_id: site.id,
          geometry: `SRID=4326;POINT(${c[0]} ${c[1]})`,
          agency_code: p.agency_code ?? null,
          monitoring_location_number: p.monitoring_location_number ?? null,
          monitoring_location_name: p.monitoring_location_name ?? null,
          state_code: p.state_code ?? null,
          county_code: p.county_code ?? null,
          site_type_code: p.site_type_code ?? null,
          hydrologic_unit_code: p.hydrologic_unit_code ?? null,
          aquifer_code: p.aquifer_code ?? null,
          aquifer_type_code: p.aquifer_type_code ?? null,
          altitude: p.altitude !== null ? parseFloat(p.altitude) : null,
          vertical_datum: p.vertical_datum ?? null
        };
      });

      const { error } = await supabase
        .from('groundwater_monitoring_sites')
        .upsert(siteRecords, { onConflict: 'monitoring_location_id' });

      if (error) {
        console.error(`${countyName} County batch upsert error:`, error.message);
        throw error;
      }

      totalInserted += batch.length;
      console.log(`${countyName} County: Processed ${totalInserted}/${validSites.length} sites`);
    }

    console.log(`${countyName} County sites complete: ${totalInserted} sites processed`);
    return { countyCode, countyName, siteCount: totalInserted };

  } catch (error) {
    console.error(`Error processing ${countyName} County sites:`, error.message);
    throw error;
  }
}

async function fetchStatewideGroundwaterSites() {
  console.log('Starting California statewide groundwater monitoring sites update...');
  
  const countyCodes = USE_PRIORITY_COUNTIES_ONLY ? getPriorityCountyCodes() : getAllCountyCodes();
  console.log(`Processing ${countyCodes.length} counties (${USE_PRIORITY_COUNTIES_ONLY ? 'priority counties only' : 'all California counties'})...`);
  
  const startTime = new Date();
  let totalSites = 0;
  
  // Process counties in batches to manage API load
  const results = await processCountyInBatches(
    countyCodes, 
    fetchAndInsertCountySites, 
    COUNTY_BATCH_SIZE
  );
  
  // Summarize results
  results.forEach(result => {
    if (result && result.siteCount) {
      totalSites += result.siteCount;
    }
  });
  
  const duration = (new Date() - startTime) / 1000 / 60; // minutes
  
  console.log(`\n=== CALIFORNIA STATEWIDE SITES UPDATE COMPLETE ===`);
  console.log(`Total counties processed: ${results.length}/${countyCodes.length}`);
  console.log(`Total sites processed: ${totalSites.toLocaleString()}`);
  console.log(`Total duration: ${duration.toFixed(1)} minutes`);
  
  // Log summary to database
  try {
    await supabase.from('job_logs').insert({
      job_name: 'statewide_sites_update',
      status: 'success',
      records_processed: totalSites,
      counties_processed: results.length,
      duration_minutes: Math.round(duration),
      completed_at: new Date().toISOString(),
      details: `Processed ${results.length} counties with ${totalSites} total sites`
    });
  } catch (logError) {
    console.warn('Failed to log completion:', logError.message);
  }
}

// Run the sites update
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchStatewideGroundwaterSites().catch(err => {
    console.error('Statewide sites update error:', err.message);
    process.exit(1);
  });
}

export { fetchAndInsertCountySites, fetchStatewideGroundwaterSites };
