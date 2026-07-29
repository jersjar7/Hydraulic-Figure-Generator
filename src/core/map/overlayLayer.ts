import type { GeoJsonGeometry, MapOverlay } from '../types'
import type { MapView } from './view'

const EARTH_RADIUS = 6_378_137

function lonLatToMercator(longitude: number, latitude: number) {
  return [
    (longitude * Math.PI * EARTH_RADIUS) / 180,
    Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360)) *
      EARTH_RADIUS,
  ] as const
}

function drawOverlayGeometry(
  context: CanvasRenderingContext2D,
  geometry: GeoJsonGeometry,
  view: MapView,
  color: string,
  width: number,
) {
  const drawLine = (coordinates: unknown, close = false) => {
    if (!Array.isArray(coordinates) || coordinates.length === 0) return
    context.beginPath()
    for (let index = 0; index < coordinates.length; index += 1) {
      const pair = coordinates[index]
      if (!Array.isArray(pair) || pair.length < 2) continue
      const [mx, my] = lonLatToMercator(Number(pair[0]), Number(pair[1]))
      const [x, y] = view.toLocal(mx, my)
      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    }
    if (close) context.closePath()
    context.stroke()
  }

  context.strokeStyle = color
  context.fillStyle = color
  context.lineWidth = width
  context.lineJoin = 'round'
  context.lineCap = 'round'

  if (geometry.type === 'LineString') drawLine(geometry.coordinates)
  else if (geometry.type === 'MultiLineString') {
    for (const line of (geometry.coordinates as unknown[]) ?? []) {
      drawLine(line)
    }
  } else if (geometry.type === 'Polygon') {
    for (const ring of (geometry.coordinates as unknown[]) ?? []) {
      drawLine(ring, true)
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of (geometry.coordinates as unknown[]) ?? []) {
      for (const ring of (polygon as unknown[]) ?? []) {
        drawLine(ring, true)
      }
    }
  } else if (geometry.type === 'Point') {
    const coordinates = geometry.coordinates
    if (!Array.isArray(coordinates) || coordinates.length < 2) return
    const [mx, my] = lonLatToMercator(
      Number(coordinates[0]),
      Number(coordinates[1]),
    )
    const [x, y] = view.toLocal(mx, my)
    context.beginPath()
    context.arc(x, y, Math.max(3, width * 1.8), 0, Math.PI * 2)
    context.fill()
  } else if (geometry.type === 'MultiPoint') {
    for (const point of (geometry.coordinates as unknown[]) ?? []) {
      drawOverlayGeometry(
        context,
        { type: 'Point', coordinates: point },
        view,
        color,
        width,
      )
    }
  } else if (geometry.type === 'GeometryCollection') {
    for (const child of geometry.geometries ?? []) {
      drawOverlayGeometry(context, child, view, color, width)
    }
  }
}

export function drawOverlays(
  context: CanvasRenderingContext2D,
  overlays: MapOverlay[],
  view: MapView,
) {
  context.save()
  for (const overlay of overlays) {
    if (!overlay.visible) continue
    for (const feature of overlay.geojson.features) {
      if (!feature.geometry) continue
      drawOverlayGeometry(
        context,
        feature.geometry,
        view,
        overlay.color,
        overlay.width,
      )
    }
  }
  context.restore()
}
