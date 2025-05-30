import fetch from 'node-fetch';
import { supabase } from './supabase.js';

// List of all California county FIPS codes (with state prefix "06")
const COUNTY_CODES = [
  "06021","06023","06025","06027","06029","06031","06033","06035","06037","06039",
  "06041","06043","06045","06047","06049","06051","06053","06055","06057","06059",
  "06061","06063","06065","06067","06069","06071","06073","06075","06077","06079",
  "06081","06083","06085","06087","06089","06091","06093","06095","06097","06099",
  "06101","06103","06105","06107","06109","06111","06113","06115"
];

async function fetchAndInsertGWTimeseries() {
  for (const countyCd of COUNTY_CODES) {
    const url = `https://waterservices.usgs.gov/nwis/gwlevels/?format=json&countyCd=${countyCd}&indent=on&siteStatus=active&siteType=GW`;
    console.log(`Fetching data for county ${countyCd}...`);
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`HTTP ${res.status} for county ${countyCd}:`, await res.text());
      continue;
    }

    const data = await res.json();
    const seriesList = data?.value?.timeSeries ?? [];

    for (const series of seriesList) {
      const values   = series.values?.[0]?.value ?? [];
      const variable = series.variable;
      const site     = series.sourceInfo;
      const methodId = series.values?.[0]?.method?.[0]?.methodID ?? null;

      const lat      = site?.geoLocation?.geogLocation?.latitude ?? null;
      const lon      = site?.geoLocation?.geogLocation?.longitude ?? null;
      const geometry = lat != null && lon != null
        ? `SRID=4326;POINT(${lon} ${lat})`
        : null;

      const siteCode   = site?.siteCode?.[0]?.value ?? null;
      const agencyCode = site?.siteCode?.[0]?.agencyCode ?? null;
      const siteName   = site?.siteName ?? null;
      const propsMap   = Object.fromEntries((site.siteProperty || []).map(p => [p.name, p.value]));

      for (const v of values) {
        const val = parseFloat(v.value);
        if (isNaN(val)) continue;

        const { error } = await supabase
          .from('groundwater_time_series')
          .insert({
            monitoring_location_id:  siteCode,
            site_name:               siteName,
            agency_code:             agencyCode,
            huc_code:                propsMap.hucCd ?? null,
            state_code:              propsMap.stateCd ?? null,
            county_code:             propsMap.countyCd ?? null,
            latitude:                lat,
            longitude:               lon,
            geometry,
            variable_code:           variable.variableCode?.[0]?.value ?? null,
            variable_name:           variable.variableName ?? null,
            variable_description:    variable.variableDescription ?? null,
            unit:                    variable.unit?.unitCode ?? null,
            variable_id:             variable.variableCode?.[0]?.variableID ?? null,
            measurement_datetime:    v.dateTime,
            measurement_value:       val,
            qualifiers:              v.qualifiers ?? [],
            method_id:               methodId
          });

        if (error) {
          console.error(`Insert error for ${siteCode} (${countyCd}) at ${v.dateTime}:`, error.message);
        }
      }
    }

    console.log(`Done with county ${countyCd}.`);
  }

  console.log('All California counties processed.');
}

fetchAndInsertGWTimeseries()
  .catch(err => console.error('Fatal error:', err.message));
