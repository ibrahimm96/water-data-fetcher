import fetch from 'node-fetch';
import { supabase } from './supabase.js';
import { upsertTimeSeriesData } from './utils.js';

const GWLEVELS_URL = 'https://waterservices.usgs.gov/nwis/gwlevels/?format=json&countyCd=06047&indent=on&siteStatus=active&siteType=GW';

async function fetchAndInsertMercedData() {
  const res = await fetch(GWLEVELS_URL);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - ${res.statusText}: ${await res.text()}`);
  }

  const data = await res.json();
  const seriesList = data?.value?.timeSeries ?? [];
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

  if (allRecords.length > 0) {
    await upsertTimeSeriesData(supabase, allRecords);
    console.log(`Upserted ${allRecords.length} groundwater time series records for Merced County.`);
  } else {
    console.log('No valid records found to insert.');
  }
}

fetchAndInsertMercedData().catch(err => {
  console.error('Time series fetch error:', err.message);
});
