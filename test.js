// Not using this, but keeping for reference

import fetch from 'node-fetch';
import { supabase } from './supabase.js';

async function fetchAndInsert() {
  const siteUrl = 'https://api.waterdata.usgs.gov/ogcapi/v0/collections/monitoring-locations/items?f=json&lang=en-US&limit=100&skipGeometry=false&offset=8217&state_code=06&site_type_code=GW';
  const res = await fetch(siteUrl);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status} - ${res.statusText}\n${errorText}`);
  }

  const data = await res.json();

  const validItems = data.features.filter(item => {
    const p = item.properties;
    const g = item.geometry;
    const c = g?.coordinates;

    return (
      p.site_type_code?.includes('GW') &&
      p.state_code === '06' &&
      item.id &&
      c &&
      p.agency_code &&
      p.monitoring_location_number
    );
  });

  for (const item of validItems) {
    const p = item.properties;
    const c = item.geometry.coordinates;

    const siteCode = item.id.split('-')[1]?.match(/^\d{1,15}$/)?.[0];

    if (!siteCode) {
      console.warn(`Skipping ${item.id} — invalid site code`);
      continue;
    }

    const nwisUrl = `https://waterservices.usgs.gov/nwis/iv/?format=rdb&sites=${siteCode}&parameterCd=72019&startDT=2025-05-20&endDT=2025-05-27`;

    const nwisRes = await fetch(nwisUrl);
    const nwisText = await nwisRes.text();

    if (!nwisRes.ok || !nwisText.includes('USGS')) {
      console.log(`Skipping ${item.id} — no metadata from NWIS`);
      continue;
    }

    const insertSite = await supabase.from('groundwater_monitoring_sites').insert({
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
      altitude: parseFloat(p.altitude) || null,
      vertical_datum: p.vertical_datum || null
    });

    if (insertSite.error) {
      console.error(`Insert error for ${item.id}:`, insertSite.error.message);
    }
  }

  console.log(`Inserted groundwater sites with verified NWIS metadata.`);
}

fetchAndInsert().catch(err => {
  console.error('Fetch error:', err.message);
});
