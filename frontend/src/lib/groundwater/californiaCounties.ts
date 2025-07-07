// California County Codes to Names Mapping
// FIPS codes for California counties (06xxx format, but stored as just the last 3 digits)

export interface CaliforniaCounty {
  code: string
  name: string
  fipsCode: string // Full FIPS code (06xxx)
}

export const CALIFORNIA_COUNTIES: CaliforniaCounty[] = [
  { code: "001", name: "Alameda", fipsCode: "06001" },
  { code: "003", name: "Alpine", fipsCode: "06003" },
  { code: "005", name: "Amador", fipsCode: "06005" },
  { code: "007", name: "Butte", fipsCode: "06007" },
  { code: "009", name: "Calaveras", fipsCode: "06009" },
  { code: "011", name: "Colusa", fipsCode: "06011" },
  { code: "013", name: "Contra Costa", fipsCode: "06013" },
  { code: "015", name: "Del Norte", fipsCode: "06015" },
  { code: "017", name: "El Dorado", fipsCode: "06017" },
  { code: "019", name: "Fresno", fipsCode: "06019" },
  { code: "021", name: "Glenn", fipsCode: "06021" },
  { code: "023", name: "Humboldt", fipsCode: "06023" },
  { code: "025", name: "Imperial", fipsCode: "06025" },
  { code: "027", name: "Inyo", fipsCode: "06027" },
  { code: "029", name: "Kern", fipsCode: "06029" },
  { code: "031", name: "Kings", fipsCode: "06031" },
  { code: "033", name: "Lake", fipsCode: "06033" },
  { code: "035", name: "Lassen", fipsCode: "06035" },
  { code: "037", name: "Los Angeles", fipsCode: "06037" },
  { code: "039", name: "Madera", fipsCode: "06039" },
  { code: "041", name: "Marin", fipsCode: "06041" },
  { code: "043", name: "Mariposa", fipsCode: "06043" },
  { code: "045", name: "Mendocino", fipsCode: "06045" },
  { code: "047", name: "Merced", fipsCode: "06047" },
  { code: "049", name: "Modoc", fipsCode: "06049" },
  { code: "051", name: "Mono", fipsCode: "06051" },
  { code: "053", name: "Monterey", fipsCode: "06053" },
  { code: "055", name: "Napa", fipsCode: "06055" },
  { code: "057", name: "Nevada", fipsCode: "06057" },
  { code: "059", name: "Orange", fipsCode: "06059" },
  { code: "061", name: "Placer", fipsCode: "06061" },
  { code: "063", name: "Plumas", fipsCode: "06063" },
  { code: "065", name: "Riverside", fipsCode: "06065" },
  { code: "067", name: "Sacramento", fipsCode: "06067" },
  { code: "069", name: "San Benito", fipsCode: "06069" },
  { code: "071", name: "San Bernardino", fipsCode: "06071" },
  { code: "073", name: "San Diego", fipsCode: "06073" },
  { code: "075", name: "San Francisco", fipsCode: "06075" },
  { code: "077", name: "San Joaquin", fipsCode: "06077" },
  { code: "079", name: "San Luis Obispo", fipsCode: "06079" },
  { code: "081", name: "San Mateo", fipsCode: "06081" },
  { code: "083", name: "Santa Barbara", fipsCode: "06083" },
  { code: "085", name: "Santa Clara", fipsCode: "06085" },
  { code: "087", name: "Santa Cruz", fipsCode: "06087" },
  { code: "089", name: "Shasta", fipsCode: "06089" },
  { code: "091", name: "Sierra", fipsCode: "06091" },
  { code: "093", name: "Siskiyou", fipsCode: "06093" },
  { code: "095", name: "Solano", fipsCode: "06095" },
  { code: "097", name: "Sonoma", fipsCode: "06097" },
  { code: "099", name: "Stanislaus", fipsCode: "06099" },
  { code: "101", name: "Sutter", fipsCode: "06101" },
  { code: "103", name: "Tehama", fipsCode: "06103" },
  { code: "105", name: "Trinity", fipsCode: "06105" },
  { code: "107", name: "Tulare", fipsCode: "06107" },
  { code: "109", name: "Tuolumne", fipsCode: "06109" },
  { code: "111", name: "Ventura", fipsCode: "06111" },
  { code: "113", name: "Yolo", fipsCode: "06113" },
  { code: "115", name: "Yuba", fipsCode: "06115" }
]

// Create lookup maps for efficient access
export const COUNTY_CODE_TO_NAME: Record<string, string> = CALIFORNIA_COUNTIES.reduce((acc, county) => {
  acc[county.code] = county.name
  return acc
}, {} as Record<string, string>)

export const COUNTY_NAME_TO_CODE: Record<string, string> = CALIFORNIA_COUNTIES.reduce((acc, county) => {
  acc[county.name] = county.code
  return acc
}, {} as Record<string, string>)

// Helper functions
export function getCountyName(code: string): string {
  return COUNTY_CODE_TO_NAME[code] || `Unknown County (${code})`
}

export function getCountyCode(name: string): string | undefined {
  return COUNTY_NAME_TO_CODE[name]
}

// Get counties sorted by name for UI display
export function getCountiesSortedByName(): CaliforniaCounty[] {
  return [...CALIFORNIA_COUNTIES].sort((a, b) => a.name.localeCompare(b.name))
}

// Get unique county codes from site data
export function getUniqueCountyCodes(sites: { county_code?: string | null }[]): string[] {
  const codes = new Set<string>()
  sites.forEach(site => {
    if (site.county_code && site.county_code.trim() !== '') {
      codes.add(site.county_code.trim())
    }
  })
  return Array.from(codes).sort()
}