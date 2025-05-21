import fetch from 'node-fetch';
import { supabase } from './supabase.js';

async function fetchAndInsert() {
  const url = 'https://waterservices.usgs.gov/nwis/site/?format=rdb&stateCd=CA&siteType=GW&siteStatus=all';
  const response = await fetch(url);
  const text = await response.text();

  const lines = text
    .split('\n')
    .filter(line => !line.startsWith('#') && line.trim() !== '');

  const headers = lines[0].split('\t');
  const dataRows = lines.slice(1);

  for (const line of dataRows) {
    const values = line.split('\t');
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i]]));

    const lat = row.dec_lat_va;
    const lon = row.dec_long_va;

    if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
      const result = await supabase.from('groundwater_monitoring_sites_min').insert({
        monitoring_location_id: row.site_no,
        geometry: `SRID=4326;POINT(${lon} ${lat})`,
        agency_code: row.agency_cd || null,
        monitoring_location_number: row.site_no || null,
        monitoring_location_name: row.station_nm || null,
        state_code: row.state_cd || null,
        county_code: row.county_cd || null,
        site_type_code: row.site_tp_cd || null,
        altitude: row.alt_va ? parseFloat(row.alt_va) : null,
        vertical_datum: row.alt_datum_cd || null
      });

      if (result.error) {
        console.error(`Insert error for ${row.site_no}:`, result.error.message);
      }
    } else {
      console.warn(`Skipping ${row.site_no}: missing or invalid lat/lon`);
    }
  }

  console.log('Done inserting data.');
}

fetchAndInsert().catch(err => {
  console.error('Fetch error:', err.message);
});
