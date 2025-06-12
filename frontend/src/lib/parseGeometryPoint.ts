export const parseGeometryPoint = (wktGeometry: string): { latitude: number; longitude: number } | null => {
  const match = wktGeometry?.match(/POINT\(([^)]+)\)/)
  if (!match) return null

  const [lng, lat] = match[1].split(' ').map(Number)
  if (isNaN(lat) || isNaN(lng)) return null

  return { latitude: lat, longitude: lng }
}