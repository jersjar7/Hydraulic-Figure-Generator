import type {
  Bounds,
  FigureSettings,
  MapCoordinate,
  MapElementPositions,
} from '../types'

export const FRAMES = {
  landscape: { width: 1650, height: 1275 },
  portrait: { width: 1275, height: 1650 },
} as const

export const DEFAULT_ELEMENT_POSITIONS: MapElementPositions = {
  title: { anchor: 'tc', offX: 0, offY: 0 },
  diffLegend: { anchor: 'br', offX: 0, offY: 0 },
  north: { anchor: 'tr', offX: 0, offY: 0 },
  scale: { anchor: 'bl', offX: 0, offY: 0 },
  wetDry: { anchor: 'mr', offX: 0, offY: 0 },
}

export type MapFrame = {
  width: number
  height: number
}

export type MapView = {
  scale: number
  originX: number
  originY: number
  rotationRadians: number
  centerX: number
  centerY: number
  toLocal(mx: number, my: number): [number, number]
  toScreen(mx: number, my: number): [number, number]
  screenToMerc(x: number, y: number): MapCoordinate
  coverBounds(): Bounds
}

export function makeMapView(
  bounds: Bounds,
  frame: MapFrame,
  settings: FigureSettings,
): MapView {
  const centerX = (bounds.x0 + bounds.x1) / 2
  const centerY = (bounds.y0 + bounds.y1) / 2
  const scale =
    Math.min(
      frame.width / (bounds.x1 - bounds.x0 || 1),
      frame.height / (bounds.y1 - bounds.y0 || 1),
    ) *
    0.88 *
    settings.zoom
  const originX = frame.width / 2 + settings.panX
  const originY = frame.height / 2 + settings.panY
  const rotationRadians = (settings.rotation * Math.PI) / 180
  const cosine = Math.cos(rotationRadians)
  const sine = Math.sin(rotationRadians)

  const view: MapView = {
    scale,
    originX,
    originY,
    rotationRadians,
    centerX,
    centerY,
    toLocal(mx, my) {
      return [(mx - centerX) * scale, -(my - centerY) * scale]
    },
    toScreen(mx, my) {
      const [localX, localY] = this.toLocal(mx, my)
      return [
        originX + localX * cosine - localY * sine,
        originY + localX * sine + localY * cosine,
      ]
    },
    screenToMerc(x, y) {
      const dx = x - originX
      const dy = y - originY
      const localX = dx * cosine + dy * sine
      const localY = -dx * sine + dy * cosine
      return {
        x: centerX + localX / scale,
        y: centerY - localY / scale,
      }
    },
    coverBounds() {
      const corners = [
        this.screenToMerc(0, 0),
        this.screenToMerc(frame.width, 0),
        this.screenToMerc(0, frame.height),
        this.screenToMerc(frame.width, frame.height),
      ]
      return {
        x0: Math.min(...corners.map((corner) => corner.x)),
        x1: Math.max(...corners.map((corner) => corner.x)),
        y0: Math.min(...corners.map((corner) => corner.y)),
        y1: Math.max(...corners.map((corner) => corner.y)),
      }
    },
  }

  return view
}

export function canvasPointToMap(
  x: number,
  y: number,
  bounds: Bounds,
  settings: FigureSettings,
): MapCoordinate {
  return makeMapView(
    bounds,
    FRAMES[settings.orientation],
    settings,
  ).screenToMerc(x, y)
}

export function mapPointToCanvas(
  point: MapCoordinate,
  bounds: Bounds,
  settings: FigureSettings,
) {
  const view = makeMapView(bounds, FRAMES[settings.orientation], settings)
  const [x, y] = view.toScreen(point.x, point.y)
  return { x, y }
}
