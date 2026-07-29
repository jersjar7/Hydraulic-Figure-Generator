import proj4 from 'proj4'
import type {
  CenterlineCandidate,
  GeoJsonGeometry,
  MapCoordinate,
  MapOverlay,
} from '../types'
const EARTH_RADIUS = 6_378_137

function lonLatToMercator(longitude: number, latitude: number) {
  return {
    x: (longitude * Math.PI * EARTH_RADIUS) / 180,
    y:
      Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360)) *
      EARTH_RADIUS,
  }
}

function coordinate(value: unknown) {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    !Number.isFinite(Number(value[0])) ||
    !Number.isFinite(Number(value[1]))
  ) {
    return null
  }
  return [Number(value[0]), Number(value[1])] as const
}

function geometryLineParts(geometry: GeoJsonGeometry): unknown[][] {
  if (geometry.type === 'LineString') {
    return Array.isArray(geometry.coordinates)
      ? [geometry.coordinates as unknown[]]
      : []
  }
  if (geometry.type === 'MultiLineString') {
    return Array.isArray(geometry.coordinates)
      ? (geometry.coordinates as unknown[][])
      : []
  }
  if (geometry.type === 'GeometryCollection') {
    return (geometry.geometries ?? []).flatMap(geometryLineParts)
  }
  return []
}

function pathLength(points: MapCoordinate[]) {
  let length = 0
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    )
  }
  return length
}

export function extractCenterlineCandidates(
  overlays: MapOverlay[],
  modelWkt: string,
) {
  const toModel = proj4('WGS84', modelWkt)
  const candidates: CenterlineCandidate[] = []

  for (const overlay of overlays) {
    overlay.geojson.features.forEach((feature, featureIndex) => {
      if (!feature.geometry) return
      geometryLineParts(feature.geometry).forEach((part, partIndex) => {
        const mapPoints: MapCoordinate[] = []
        const modelPoints: MapCoordinate[] = []
        for (const value of part) {
          const point = coordinate(value)
          if (!point) continue
          const [longitude, latitude] = point
          const model = toModel.forward([longitude, latitude])
          const modelPoint = { x: model[0], y: model[1] }
          const previous = modelPoints.at(-1)
          if (
            previous &&
            Math.hypot(
              modelPoint.x - previous.x,
              modelPoint.y - previous.y,
            ) < 1e-8
          ) {
            continue
          }
          mapPoints.push(lonLatToMercator(longitude, latitude))
          modelPoints.push(modelPoint)
        }
        if (modelPoints.length < 2) return
        const lengthFeet = pathLength(modelPoints)
        if (!Number.isFinite(lengthFeet) || lengthFeet <= 0) return
        candidates.push({
          id: `${overlay.id}:${featureIndex}:${partIndex}`,
          overlayId: overlay.id,
          overlayName: overlay.name,
          featureIndex,
          partIndex,
          mapPoints,
          modelPoints,
          lengthFeet,
        })
      })
    })
  }
  return candidates
}
