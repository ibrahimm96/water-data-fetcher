import fetch from 'node-fetch';
import { supabase } from './supabase.js';

const siteUrl = 'https://api.waterdata.usgs.gov/ogcapi/v0/collections/monitoring-locations/items?f=json&lang=en-US&limit=10000&skipGeometry=false&offset=0&state_code=06&county_code=047&site_type_code=GW';

async function fetchAndInsertMercedSites() {
  const res = await fetch(siteUrl);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status} - ${res.statusText}\n${errorText}`);
  }

  const data = await res.json();
  const features = data.features ?? [];

  const validSites = features.filter(item => {
    const g = item.geometry;
    return item.id && g?.coordinates?.length === 2;
  });

  for (const site of validSites) {
    const p = site.properties;
    const c = site.geometry.coordinates;

    const result = await supabase.from('groundwater_monitoring_sites').upsert({
      monitoring_location_id: site.id, // Correct field to use as unique ID
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
    }, { onConflict: 'monitoring_location_id' });

    if (result.error) {
      console.error(`Insert error for ${site.id}:`, result.error.message);
    }
  }

  console.log(`Inserted ${validSites.length} Merced County groundwater monitoring sites.`);
}

fetchAndInsertMercedSites().catch(err => {
  console.error('Fetch error:', err.message);
});
