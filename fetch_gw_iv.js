import fetch from 'node-fetch';

// Config
const PARAMETER_CD = '72019'; // Groundwater level below land surface
const DAYS_BACK = 7;
const RATE_LIMIT_DELAY = 1000; // ms

const COUNTY_CODES = [
  '001','003','005','007','009','011','013','015','017','019','021','023','025','027','029','031','033',
  '035','037','039','041','043','045','047','049','051','053','055','057','059','061','063','065','067',
  '069','071','073','075','077','079','081','083','085','087','089','091','093','095','097','099','101',
  '103','105','107','109','111','113','115'
];

// Get date range
function getDateRange(daysBack) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - daysBack);

  const fmt = (d) => d.toISOString().split('T')[0];
  return { start: fmt(start), end: fmt(end) };
}

// Retry fetch
async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (attempt < retries - 1) await new Promise(r => setTimeout(r, delay));
      else throw err;
    }
  }
}

// Build DV URL
function buildDVUrl(countyCode, startDT, endDT) {
  const fullCountyCd = `06${countyCode.padStart(3, '0')}`;
  return `https://waterservices.usgs.gov/nwis/dv/?format=json&parameterCd=${PARAMETER_CD}&startDT=${startDT}&endDT=${endDT}&siteType=GW&countyCd=${fullCountyCd}`;
}

// Main
async function fetchDailyGWForAllCounties() {
  const { start, end } = getDateRange(DAYS_BACK);

  for (const countyCode of COUNTY_CODES) {
    console.log(`\n=== County ${countyCode} (${start} to ${end}) ===`);
    const url = buildDVUrl(countyCode, start, end);

    try {
      const res = await fetchWithRetry(url);
      const json = await res.json();
      const count = json?.value?.timeSeries?.length ?? 0;
      console.log(`  Time series found: ${count}`);
    } catch (err) {
      console.error(`  Error fetching for county ${countyCode}: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
  }
}

// Run
fetchDailyGWForAllCounties();
