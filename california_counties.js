// California counties with FIPS codes for USGS API
// Format: { code: 'FIPS code', name: 'County name' }
export const CALIFORNIA_COUNTIES = [
  { code: '06001', name: 'Alameda' },
  { code: '06003', name: 'Alpine' },
  { code: '06005', name: 'Amador' },
  { code: '06007', name: 'Butte' },
  { code: '06009', name: 'Calaveras' },
  { code: '06011', name: 'Colusa' },
  { code: '06013', name: 'Contra Costa' },
  { code: '06015', name: 'Del Norte' },
  { code: '06017', name: 'El Dorado' },
  { code: '06019', name: 'Fresno' },
  { code: '06021', name: 'Glenn' },
  { code: '06023', name: 'Humboldt' },
  { code: '06025', name: 'Imperial' },
  { code: '06027', name: 'Inyo' },
  { code: '06029', name: 'Kern' },
  { code: '06031', name: 'Kings' },
  { code: '06033', name: 'Lake' },
  { code: '06035', name: 'Lassen' },
  { code: '06037', name: 'Los Angeles' },
  { code: '06039', name: 'Madera' },
  { code: '06041', name: 'Marin' },
  { code: '06043', name: 'Mariposa' },
  { code: '06045', name: 'Mendocino' },
  { code: '06047', name: 'Merced' },
  { code: '06049', name: 'Modoc' },
  { code: '06051', name: 'Mono' },
  { code: '06053', name: 'Monterey' },
  { code: '06055', name: 'Napa' },
  { code: '06057', name: 'Nevada' },
  { code: '06059', name: 'Orange' },
  { code: '06061', name: 'Placer' },
  { code: '06063', name: 'Plumas' },
  { code: '06065', name: 'Riverside' },
  { code: '06067', name: 'Sacramento' },
  { code: '06069', name: 'San Benito' },
  { code: '06071', name: 'San Bernardino' },
  { code: '06073', name: 'San Diego' },
  { code: '06075', name: 'San Francisco' },
  { code: '06077', name: 'San Joaquin' },
  { code: '06079', name: 'San Luis Obispo' },
  { code: '06081', name: 'San Mateo' },
  { code: '06083', name: 'Santa Barbara' },
  { code: '06085', name: 'Santa Clara' },
  { code: '06087', name: 'Santa Cruz' },
  { code: '06089', name: 'Shasta' },
  { code: '06091', name: 'Sierra' },
  { code: '06093', name: 'Siskiyou' },
  { code: '06095', name: 'Solano' },
  { code: '06097', name: 'Sonoma' },
  { code: '06099', name: 'Stanislaus' },
  { code: '06101', name: 'Sutter' },
  { code: '06103', name: 'Tehama' },
  { code: '06105', name: 'Trinity' },
  { code: '06107', name: 'Tulare' },
  { code: '06109', name: 'Tuolumne' },
  { code: '06111', name: 'Ventura' },
  { code: '06113', name: 'Yolo' },
  { code: '06115', name: 'Yuba' }
];

// Get all county codes as array
export function getAllCountyCodes() {
  return CALIFORNIA_COUNTIES.map(county => county.code);
}

// Get county name by code
export function getCountyName(code) {
  const county = CALIFORNIA_COUNTIES.find(c => c.code === code);
  return county ? county.name : 'Unknown';
}

// Get high-priority counties (major agricultural and urban areas)
export function getPriorityCountyCodes() {
  const priorityCounties = [
    '06019', // Fresno
    '06029', // Kern  
    '06031', // Kings
    '06037', // Los Angeles
    '06039', // Madera
    '06047', // Merced
    '06053', // Monterey
    '06059', // Orange
    '06065', // Riverside
    '06067', // Sacramento
    '06071', // San Bernardino
    '06073', // San Diego
    '06077', // San Joaquin
    '06085', // Santa Clara
    '06099', // Stanislaus
    '06107', // Tulare
    '06111', // Ventura
    '06113'  // Yolo
  ];
  return priorityCounties;
}