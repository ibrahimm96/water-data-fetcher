import fetch from 'node-fetch';
import { supabase } from './supabase.js';

async function fetchAndInsert() {
  const url = 'https://api.waterdata.usgs.gov/ogcapi/v0/collections/monitoring-locations/items?f=json&lang=en-US&limit=3000&skipGeometry=false&offset=0&state_code=06&site_type_code=GW';
  const res = await fetch(url);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status} - ${res.statusText}\n${errorText}`);
  }

  const data = await res.json();

  console.log(`\n=== All ${data.features.length} Fetched Features ===`);
  data.features.forEach((item, index) => {
    console.log(`\n#${index + 1} — ID: ${item.id}`);
    console.log(JSON.stringify(item, null, 2));
  });

  const validItems = data.features.filter(item => {
    const p = item.properties;
    const g = item.geometry;
    const c = g?.coordinates;

    return (
      p.site_type_code &&
      p.site_type_code.includes('GW') &&
      p.state_code === '06' &&
      item.id &&
      c &&
      p.agency_code &&
      p.monitoring_location_number &&
      p.monitoring_location_name &&
      p.county_code &&
      p.hydrologic_unit_code &&
      p.aquifer_code &&
      p.aquifer_type_code &&
      p.altitude &&
      p.vertical_datum
    );
  });



  for (const item of validItems) {
    const p = item.properties;
    const g = item.geometry;
    const c = g?.coordinates;

    const result = await supabase.from('groundwater_monitoring_sites').insert({
      monitoring_location_id: item.id || null,
      geometry: c ? `SRID=4326;POINT(${c[0]} ${c[1]})` : null,
      agency_code: p.agency_code || null,
      monitoring_location_number: p.monitoring_location_number || null,
      monitoring_location_name: p.monitoring_location_name || null,
      state_code: p.state_code || null,
      county_code: p.county_code || null,
      site_type_code: p.site_type_code || null,
      hydrologic_unit_code: p.hydrologic_unit_code || null,
      aquifer_code: p.aquifer_code || null,
      aquifer_type_code: p.aquifer_type_code || null,
      altitude: p.altitude ? parseFloat(p.altitude) : null,
      vertical_datum: p.vertical_datum || null
    });

    if (result.error) {
      console.error(`Insert error for ${item.id}:`, result.error.message);
    }
  }

  console.log(`Inserted ${validItems.length} groundwater site(s).`);
}

fetchAndInsert().catch(err => {
  console.error('Fetch error:', err.message);
});
