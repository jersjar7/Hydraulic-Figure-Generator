import type {
  Anchor,
  Bounds,
  FigureSettings,
  GeoJsonGeometry,
  MapAnnotation,
  MapCoordinate,
  MapElementPositions,
  MapOverlay,
  ProjectedGeometry,
  ResultLabelField,
  WseDifferenceScene,
} from './types'
import { runDisplayName } from './hydraulicEngine'

const EARTH_RADIUS = 6_378_137
const EARTH_CIRCUMFERENCE = 2 * Math.PI * EARTH_RADIUS
const VALID = (value: number) =>
  value != null && Number.isFinite(value) && value > -900

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

type Frame = {
  width: number
  height: number
}

type View = {
  scale: number
  originX: number
  originY: number
  rotationRadians: number
  centerX: number
  centerY: number
  toLocal(mx: number, my: number): [number, number]
  toScreen(mx: number, my: number): [number, number]
  screenToMerc(x: number, y: number): { x: number; y: number }
  coverBounds(): Bounds
}

function makeView(
  bounds: Bounds,
  frame: Frame,
  settings: FigureSettings,
): View {
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

  const view: View = {
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

const mercatorToGlobal = (mx: number, my: number, worldPixels: number) => [
  ((mx + Math.PI * EARTH_RADIUS) / EARTH_CIRCUMFERENCE) * worldPixels,
  ((Math.PI * EARTH_RADIUS - my) / EARTH_CIRCUMFERENCE) * worldPixels,
]

const globalToMercator = (gx: number, gy: number, worldPixels: number) => [
  (gx / worldPixels) * EARTH_CIRCUMFERENCE - Math.PI * EARTH_RADIUS,
  Math.PI * EARTH_RADIUS - (gy / worldPixels) * EARTH_CIRCUMFERENCE,
]

async function drawBasemap(
  context: CanvasRenderingContext2D,
  view: View,
  opacity: number,
  signal?: AbortSignal,
) {
  if (opacity <= 0) return
  const zoomLevel = Math.max(
    2,
    Math.min(
      19,
      Math.round(Math.log2((view.scale * EARTH_CIRCUMFERENCE) / 256)),
    ),
  )
  const worldPixels = 256 * 2 ** zoomLevel
  const bounds = view.coverBounds()
  const [globalX0, globalY1] = mercatorToGlobal(
    bounds.x0,
    bounds.y0,
    worldPixels,
  )
  const [globalX1, globalY0] = mercatorToGlobal(
    bounds.x1,
    bounds.y1,
    worldPixels,
  )
  const tileX0 = Math.floor(globalX0 / 256)
  const tileX1 = Math.floor(globalX1 / 256)
  const tileY0 = Math.floor(globalY0 / 256)
  const tileY1 = Math.floor(globalY1 / 256)
  if ((tileX1 - tileX0 + 1) * (tileY1 - tileY0 + 1) > 400) return

  const tileJobs: Promise<LoadedTile | null>[] = []

  for (let tileX = tileX0; tileX <= tileX1; tileX += 1) {
    for (let tileY = tileY0; tileY <= tileY1; tileY += 1) {
      tileJobs.push(
        loadTile(view, zoomLevel, tileX, tileY, worldPixels, signal),
      )
    }
  }

  const tiles = await Promise.all(tileJobs)
  context.save()
  context.globalAlpha = opacity
  context.translate(view.originX, view.originY)
  context.rotate(view.rotationRadians)
  for (const tile of tiles) {
    if (!tile) continue
    context.drawImage(
      tile.bitmap,
      tile.x,
      tile.y,
      tile.width,
      tile.height,
    )
    tile.bitmap.close?.()
  }
  context.restore()
}

type LoadedTile = {
  bitmap: ImageBitmap
  x: number
  y: number
  width: number
  height: number
}

async function loadTile(
  view: View,
  zoom: number,
  tileX: number,
  tileY: number,
  worldPixels: number,
  signal?: AbortSignal,
): Promise<LoadedTile | null> {
  try {
    const url = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`
    const response = await fetch(url, { mode: 'cors', signal })
    if (!response.ok) return null
    const bitmap = await createImageBitmap(await response.blob())
    const [mx0, my1] = globalToMercator(
      tileX * 256,
      tileY * 256,
      worldPixels,
    )
    const [mx1, my0] = globalToMercator(
      (tileX + 1) * 256,
      (tileY + 1) * 256,
      worldPixels,
    )
    const [localX, localY] = view.toLocal(mx0, my1)
    return {
      bitmap,
      x: localX,
      y: localY,
      width: view.scale * (mx1 - mx0),
      height: view.scale * (my1 - my0),
    }
  } catch {
    // Offline or blocked tiles leave the neutral map background visible.
    return null
  }
}

function localCoordinates(projected: ProjectedGeometry, view: View) {
  const localX = new Float64Array(projected.N)
  const localY = new Float64Array(projected.N)
  for (let index = 0; index < projected.N; index += 1) {
    const point = view.toLocal(projected.mx[index], projected.my[index])
    localX[index] = point[0]
    localY[index] = point[1]
  }
  return { localX, localY }
}

const RAMP_STOPS = [
  [0, [0, 31, 176]],
  [0.25, [99, 169, 213]],
  [0.48, [236, 245, 248]],
  [0.52, [255, 255, 210]],
  [0.75, [246, 173, 55]],
  [1, [197, 32, 32]],
] as const

function interpolateColor(value: number) {
  const normalized = Math.max(0, Math.min(1, value))
  let upper = 1
  while (upper < RAMP_STOPS.length && normalized > RAMP_STOPS[upper][0]) {
    upper += 1
  }
  const [lowerPosition, lowerColor] = RAMP_STOPS[Math.max(0, upper - 1)]
  const [upperPosition, upperColor] =
    RAMP_STOPS[Math.min(RAMP_STOPS.length - 1, upper)]
  const fraction =
    upperPosition === lowerPosition
      ? 0
      : (normalized - lowerPosition) / (upperPosition - lowerPosition)
  return lowerColor.map((channel, index) =>
    Math.round(channel + (upperColor[index] - channel) * fraction),
  )
}

function differenceColor(value: number, maxAbsolute: number) {
  if (!VALID(value)) return null
  const color = interpolateColor(
    (value + maxAbsolute) / (2 * maxAbsolute || 1),
  )
  return `rgb(${color.join(',')})`
}

function fillMesh(
  context: CanvasRenderingContext2D,
  localX: Float64Array,
  localY: Float64Array,
  triangles: Uint32Array,
  values: Float32Array,
  colorForValue: (value: number) => string | null,
) {
  for (let triangle = 0; triangle < triangles.length; triangle += 3) {
    const first = triangles[triangle]
    const second = triangles[triangle + 1]
    const third = triangles[triangle + 2]
    const valueA = values[first]
    const valueB = values[second]
    const valueC = values[third]
    if (!VALID(valueA) || !VALID(valueB) || !VALID(valueC)) continue
    const color = colorForValue((valueA + valueB + valueC) / 3)
    if (!color) continue
    context.fillStyle = color
    context.beginPath()
    context.moveTo(localX[first], localY[first])
    context.lineTo(localX[second], localY[second])
    context.lineTo(localX[third], localY[third])
    context.closePath()
    context.fill()
  }
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return hex
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function fillWetDry(
  context: CanvasRenderingContext2D,
  localX: Float64Array,
  localY: Float64Array,
  triangles: Uint32Array,
  values: Int8Array,
  settings: FigureSettings,
) {
  for (let triangle = 0; triangle < triangles.length; triangle += 3) {
    const first = triangles[triangle]
    const second = triangles[triangle + 1]
    const third = triangles[triangle + 2]
    const total = values[first] + values[second] + values[third]
    if (total === 0) continue
    context.fillStyle =
      total > 0
        ? hexToRgba(settings.newlyWetColor, 0.5)
        : hexToRgba(settings.newlyDryColor, 0.5)
    context.beginPath()
    context.moveTo(localX[first], localY[first])
    context.lineTo(localX[second], localY[second])
    context.lineTo(localX[third], localY[third])
    context.closePath()
    context.fill()
  }
}

function valueStats(values: Float32Array) {
  let minimum = Number.POSITIVE_INFINITY
  let maximum = Number.NEGATIVE_INFINITY
  let valid = 0
  for (const value of values) {
    if (!VALID(value)) continue
    minimum = Math.min(minimum, value)
    maximum = Math.max(maximum, value)
    valid += 1
  }
  return { minimum, maximum, valid }
}

function drawContours(
  context: CanvasRenderingContext2D,
  localX: Float64Array,
  localY: Float64Array,
  triangles: Uint32Array,
  values: Float32Array,
  interval: number,
  color: string,
) {
  if (!Number.isFinite(interval) || interval <= 0) return
  const stats = valueStats(values)
  if (stats.valid === 0) return
  const firstLevel = Math.ceil(stats.minimum / interval) * interval
  context.save()
  context.strokeStyle = color
  context.lineWidth = 1.6
  context.globalAlpha = 0.92

  for (
    let level = firstLevel;
    level <= stats.maximum + 1e-9;
    level += interval
  ) {
    context.beginPath()
    for (let triangle = 0; triangle < triangles.length; triangle += 3) {
      const ids = [
        triangles[triangle],
        triangles[triangle + 1],
        triangles[triangle + 2],
      ]
      const intersections: [number, number][] = []
      for (let edge = 0; edge < 3; edge += 1) {
        const first = ids[edge]
        const second = ids[(edge + 1) % 3]
        const firstValue = values[first]
        const secondValue = values[second]
        if (
          !VALID(firstValue) ||
          !VALID(secondValue) ||
          firstValue === secondValue
        ) {
          continue
        }
        if (
          level >= Math.min(firstValue, secondValue) &&
          level <= Math.max(firstValue, secondValue)
        ) {
          const fraction = (level - firstValue) / (secondValue - firstValue)
          intersections.push([
            localX[first] + (localX[second] - localX[first]) * fraction,
            localY[first] + (localY[second] - localY[first]) * fraction,
          ])
        }
      }
      if (intersections.length === 2) {
        context.moveTo(intersections[0][0], intersections[0][1])
        context.lineTo(intersections[1][0], intersections[1][1])
      }
    }
    context.stroke()
  }
  context.restore()
}

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
  view: View,
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
    for (const line of (geometry.coordinates as unknown[]) ?? []) drawLine(line)
  } else if (geometry.type === 'Polygon') {
    for (const ring of (geometry.coordinates as unknown[]) ?? []) {
      drawLine(ring, true)
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of (geometry.coordinates as unknown[]) ?? []) {
      for (const ring of (polygon as unknown[]) ?? []) drawLine(ring, true)
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

function drawOverlays(
  context: CanvasRenderingContext2D,
  overlays: MapOverlay[],
  view: View,
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

function annotationScreenPoint(point: MapCoordinate, view: View) {
  const [x, y] = view.toScreen(point.x, point.y)
  return { x, y }
}

function annotationTextBox(
  context: CanvasRenderingContext2D,
  annotation: MapAnnotation,
  point: { x: number; y: number },
) {
  const lines = (annotation.text.trim() || 'Note').split(/\r?\n/)
  const lineHeight = annotation.fontSize * 1.25
  const paddingX = 10
  const paddingY = 8
  context.save()
  context.font = `600 ${annotation.fontSize}px "Segoe UI", Arial, sans-serif`
  const width =
    Math.max(...lines.map((line) => context.measureText(line).width)) +
    paddingX * 2
  const height = lines.length * lineHeight + paddingY * 2
  const x = point.x - width / 2
  const y = point.y - height / 2

  if (annotation.background) {
    roundedRectangle(context, x, y, width, height, 6)
    context.fillStyle = hexToRgba(annotation.fillColor, 0.9)
    context.strokeStyle = hexToRgba(annotation.color, 0.65)
    context.lineWidth = Math.max(1, annotation.lineWidth * 0.65)
    context.fill()
    context.stroke()
  }

  context.font = `600 ${annotation.fontSize}px "Segoe UI", Arial, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  lines.forEach((line, index) => {
    const lineY = y + paddingY + lineHeight * (index + 0.5)
    if (!annotation.background) {
      context.strokeStyle = 'rgba(255,255,255,0.96)'
      context.lineWidth = Math.max(3, annotation.fontSize * 0.22)
      context.lineJoin = 'round'
      context.strokeText(line, point.x, lineY)
    }
    context.fillStyle = annotation.color
    context.fillText(line, point.x, lineY)
  })
  context.restore()
}

function drawArrowHead(
  context: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
  lineWidth: number,
) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  const length = Math.max(12, lineWidth * 4)
  context.save()
  context.fillStyle = color
  context.beginPath()
  context.moveTo(end.x, end.y)
  context.lineTo(
    end.x - length * Math.cos(angle - Math.PI / 7),
    end.y - length * Math.sin(angle - Math.PI / 7),
  )
  context.lineTo(
    end.x - length * Math.cos(angle + Math.PI / 7),
    end.y - length * Math.sin(angle + Math.PI / 7),
  )
  context.closePath()
  context.fill()
  context.restore()
}

function drawAnnotations(
  context: CanvasRenderingContext2D,
  annotations: MapAnnotation[],
  view: View,
) {
  for (const annotation of annotations) {
    const points = annotation.points.map((point) =>
      annotationScreenPoint(point, view),
    )
    if (points.length === 0) continue

    context.save()
    context.strokeStyle = annotation.color
    context.fillStyle = annotation.color
    context.lineWidth = annotation.lineWidth
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.setLineDash(annotation.dashed ? [12, 8] : [])

    if (
      (annotation.kind === 'line' || annotation.kind === 'arrow') &&
      points[1]
    ) {
      context.beginPath()
      context.moveTo(points[0].x, points[0].y)
      context.lineTo(points[1].x, points[1].y)
      context.stroke()
      if (annotation.kind === 'arrow') {
        drawArrowHead(
          context,
          points[0],
          points[1],
          annotation.color,
          annotation.lineWidth,
        )
      }
    } else if (
      (annotation.kind === 'leader' || annotation.kind === 'result') &&
      points[1]
    ) {
      context.beginPath()
      context.moveTo(points[0].x, points[0].y)
      context.lineTo(points[1].x, points[1].y)
      context.stroke()
      context.setLineDash([])
      context.beginPath()
      context.arc(
        points[0].x,
        points[0].y,
        Math.max(4, annotation.lineWidth * 1.5),
        0,
        Math.PI * 2,
      )
      context.fill()
      annotationTextBox(context, annotation, points[1])
    } else if (annotation.kind === 'text') {
      annotationTextBox(context, annotation, points[0])
    } else if (annotation.kind === 'marker') {
      const radius = Math.max(12, annotation.fontSize * 0.72)
      context.setLineDash([])
      context.beginPath()
      context.arc(points[0].x, points[0].y, radius, 0, Math.PI * 2)
      context.fillStyle = hexToRgba(annotation.fillColor, 0.94)
      context.fill()
      context.strokeStyle = annotation.color
      context.lineWidth = annotation.lineWidth
      context.stroke()
      context.fillStyle = annotation.color
      context.font = `700 ${annotation.fontSize}px "Segoe UI", Arial, sans-serif`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(annotation.text.trim() || '1', points[0].x, points[0].y)
    }
    context.restore()
  }
}

export function canvasPointToMap(
  x: number,
  y: number,
  bounds: Bounds,
  settings: FigureSettings,
): MapCoordinate {
  const view = makeView(bounds, FRAMES[settings.orientation], settings)
  return view.screenToMerc(x, y)
}

export function mapPointToCanvas(
  point: MapCoordinate,
  bounds: Bounds,
  settings: FigureSettings,
) {
  const view = makeView(bounds, FRAMES[settings.orientation], settings)
  const [x, y] = view.toScreen(point.x, point.y)
  return { x, y }
}

function pointToSegmentDistance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y)
  const fraction = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        (dx * dx + dy * dy),
    ),
  )
  return Math.hypot(
    point.x - (start.x + fraction * dx),
    point.y - (start.y + fraction * dy),
  )
}

export function hitTestAnnotation(
  annotations: MapAnnotation[],
  bounds: Bounds,
  settings: FigureSettings,
  x: number,
  y: number,
) {
  const view = makeView(bounds, FRAMES[settings.orientation], settings)
  const pointer = { x, y }

  for (let index = annotations.length - 1; index >= 0; index -= 1) {
    const annotation = annotations[index]
    const points = annotation.points.map((point) =>
      annotationScreenPoint(point, view),
    )
    if (points.length === 0) continue
    if (annotation.kind === 'text' || annotation.kind === 'marker') {
      if (Math.hypot(x - points[0].x, y - points[0].y) <= 30) {
        return annotation.id
      }
      continue
    }
    if (
      (annotation.kind === 'leader' || annotation.kind === 'result') &&
      points[1]
    ) {
      const labelLines = (annotation.text || 'Note').split(/\r?\n/)
      const estimatedWidth =
        Math.max(...labelLines.map((line) => line.length)) *
          annotation.fontSize *
          0.62 +
        24
      const estimatedHeight =
        labelLines.length * annotation.fontSize * 1.25 + 20
      if (
        Math.abs(x - points[1].x) <= estimatedWidth / 2 &&
        Math.abs(y - points[1].y) <= estimatedHeight / 2
      ) {
        return annotation.id
      }
    }
    if (
      points[1] &&
      pointToSegmentDistance(pointer, points[0], points[1]) <=
        Math.max(10, annotation.lineWidth + 6)
    ) {
      return annotation.id
    }
  }
  return null
}

type HydraulicResultSample = {
  existingWse: number | null
  proposedWse: number | null
  difference: number | null
  existingDepth: number | null
  proposedDepth: number | null
}

function nearestNode(
  geometry: ProjectedGeometry,
  point: MapCoordinate,
) {
  let nearestIndex = -1
  let nearestDistance2 = Number.POSITIVE_INFINITY
  for (let index = 0; index < geometry.N; index += 1) {
    const dx = geometry.mx[index] - point.x
    const dy = geometry.my[index] - point.y
    const distance2 = dx * dx + dy * dy
    if (distance2 < nearestDistance2) {
      nearestDistance2 = distance2
      nearestIndex = index
    }
  }
  return { index: nearestIndex, distance2: nearestDistance2 }
}

const validResult = (value: number | undefined) =>
  value != null && VALID(value) ? value : null

export function sampleHydraulicResult(
  scene: WseDifferenceScene,
  bounds: Bounds,
  settings: FigureSettings,
  point: MapCoordinate,
): HydraulicResultSample | null {
  const view = makeView(bounds, FRAMES[settings.orientation], settings)
  const existing = nearestNode(scene.projected, point)
  const proposed = nearestNode(scene.proposedProjected, point)
  const tolerance2 = (45 / view.scale) ** 2
  const existingNear = existing.distance2 <= tolerance2
  const proposedNear = proposed.distance2 <= tolerance2
  if (!existingNear && !proposedNear) return null

  return {
    existingWse: existingNear
      ? validResult(scene.existingWse[existing.index])
      : null,
    proposedWse: proposedNear
      ? validResult(scene.proposedWse[proposed.index])
      : null,
    difference: existingNear
      ? validResult(scene.diff[existing.index])
      : null,
    existingDepth: existingNear
      ? validResult(scene.existingDepth[existing.index])
      : null,
    proposedDepth: proposedNear
      ? validResult(scene.proposedDepth[proposed.index])
      : null,
  }
}

function formattedResult(value: number | null, signed = false) {
  if (value == null) return 'No result'
  const sign = signed && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)} ft`
}

export function formatHydraulicResultLabel(
  field: ResultLabelField,
  sample: HydraulicResultSample,
) {
  if (field === 'difference') {
    return `WSE difference: ${formattedResult(sample.difference, true)}`
  }
  if (field === 'existingWse') {
    return `Existing WSE: ${formattedResult(sample.existingWse)}`
  }
  if (field === 'proposedWse') {
    return `Proposed WSE: ${formattedResult(sample.proposedWse)}`
  }
  if (field === 'existingDepth') {
    return `Existing depth: ${formattedResult(sample.existingDepth)}`
  }
  if (field === 'proposedDepth') {
    return `Proposed depth: ${formattedResult(sample.proposedDepth)}`
  }
  return [
    `Existing WSE: ${formattedResult(sample.existingWse)}`,
    `Proposed WSE: ${formattedResult(sample.proposedWse)}`,
    `Difference: ${formattedResult(sample.difference, true)}`,
  ].join('\n')
}

function roundedRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function anchorBox(
  anchor: Anchor,
  width: number,
  height: number,
  frame: Frame,
  margin: number,
  offX: number,
  offY: number,
) {
  const x = {
    l: margin,
    c: (frame.width - width) / 2,
    r: frame.width - width - margin,
  }
  const y = {
    t: margin,
    m: (frame.height - height) / 2,
    b: frame.height - height - margin,
  }
  if (anchor === 'ml') return [margin + offX, y.m + offY] as const
  if (anchor === 'mr') return [x.r + offX, y.m + offY] as const
  return [
    x[anchor[1] as keyof typeof x] + offX,
    y[anchor[0] as keyof typeof y] + offY,
  ] as const
}

function drawTitle(
  context: CanvasRenderingContext2D,
  title: string,
  frame: Frame,
  position: MapElementPositions['title'],
) {
  const fontSize = 26
  context.save()
  context.font = `700 ${fontSize}px "Segoe UI", Arial, sans-serif`
  const width = context.measureText(title).width + 30
  const height = fontSize + 20
  const [x, y] = anchorBox(
    position.anchor,
    width,
    height,
    frame,
    18,
    position.offX,
    position.offY,
  )
  roundedRectangle(context, x, y, width, height, 7)
  context.fillStyle = 'rgba(255,255,255,0.86)'
  context.strokeStyle = 'rgba(12,25,44,0.2)'
  context.fill()
  context.stroke()
  context.fillStyle = '#0d1c31'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(title, x + width / 2, y + height / 2)
  context.restore()
}

function formatLegendValue(value: number) {
  if (Math.abs(value) >= 100 || Math.abs(value % 1) < 1e-9) {
    return value.toFixed(0)
  }
  return value.toFixed(1)
}

function drawDifferenceLegend(
  context: CanvasRenderingContext2D,
  maxAbsolute: number,
  interval: number | null,
  fontSize: number,
  frame: Frame,
  position: MapElementPositions['diffLegend'],
) {
  const bandCount =
    interval && interval > 0
      ? Math.max(1, Math.min(80, Math.round((2 * maxAbsolute) / interval)))
      : 8
  const blockHeight = Math.max(fontSize + 6, 20)
  const swatchWidth = Math.round(fontSize * 1.9)
  const padding = 12
  const title = 'WSE Difference (ft)'
  const labels = Array.from({ length: bandCount + 1 }, (_, index) =>
    formatLegendValue(
      -maxAbsolute + (index * 2 * maxAbsolute) / bandCount,
    ),
  )
  context.save()
  context.font = `700 ${fontSize + 2}px "Segoe UI", Arial, sans-serif`
  const titleWidth = context.measureText(title).width
  context.font = `${fontSize}px "Segoe UI", Arial, sans-serif`
  const labelWidth = Math.max(
    ...labels.map((label) => context.measureText(label).width),
  )
  const width = Math.max(
    padding * 2 + titleWidth,
    padding * 2 + swatchWidth + 12 + labelWidth,
  )
  const titleHeight = fontSize + 14
  const barHeight = bandCount * blockHeight
  const height = padding * 2 + titleHeight + barHeight + fontSize / 2
  const [x, y] = anchorBox(
    position.anchor,
    width,
    height,
    frame,
    18,
    position.offX,
    position.offY,
  )
  roundedRectangle(context, x, y, width, height, 7)
  context.fillStyle = 'rgba(255,255,255,0.88)'
  context.strokeStyle = 'rgba(12,25,44,0.25)'
  context.fill()
  context.stroke()
  context.fillStyle = '#0d1c31'
  context.font = `700 ${fontSize + 2}px "Segoe UI", Arial, sans-serif`
  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.fillText(title, x + padding, y + padding)

  const barX = x + padding
  const barTop = y + padding + titleHeight
  const barBottom = barTop + barHeight
  for (let band = 0; band < bandCount; band += 1) {
    const middle = -maxAbsolute + ((band + 0.5) * 2 * maxAbsolute) / bandCount
    context.fillStyle = differenceColor(middle, maxAbsolute) ?? '#fff'
    context.fillRect(
      barX,
      barBottom - (band + 1) * blockHeight,
      swatchWidth,
      blockHeight,
    )
  }
  context.strokeStyle = 'rgba(12,25,44,0.55)'
  context.strokeRect(barX + 0.5, barTop + 0.5, swatchWidth, barHeight)
  context.fillStyle = '#0d1c31'
  context.font = `${fontSize}px "Segoe UI", Arial, sans-serif`
  context.textBaseline = 'middle'
  for (let index = 0; index <= bandCount; index += 1) {
    const labelY = barBottom - index * blockHeight
    context.beginPath()
    context.moveTo(barX + swatchWidth, labelY)
    context.lineTo(barX + swatchWidth + 5, labelY)
    context.stroke()
    context.fillText(labels[index], barX + swatchWidth + 9, labelY)
  }
  context.restore()
}

function drawNorthArrow(
  context: CanvasRenderingContext2D,
  frame: Frame,
  rotationRadians: number,
  position: MapElementPositions['north'],
) {
  const radius = 44
  const diameter = radius * 2
  const [x, y] = anchorBox(
    position.anchor,
    diameter,
    diameter,
    frame,
    18,
    position.offX,
    position.offY,
  )
  const centerX = x + radius
  const centerY = y + radius
  context.save()
  context.beginPath()
  context.arc(centerX, centerY, radius, 0, Math.PI * 2)
  context.fillStyle = 'rgba(255,255,255,0.88)'
  context.strokeStyle = 'rgba(12,25,44,0.3)'
  context.fill()
  context.stroke()
  context.translate(centerX, centerY)
  context.rotate(rotationRadians)
  context.fillStyle = '#0c1a2d'
  context.beginPath()
  context.moveTo(0, -24)
  context.lineTo(15, 29)
  context.lineTo(0, 15)
  context.lineTo(-15, 29)
  context.closePath()
  context.fill()
  context.font = '700 18px "Segoe UI", Arial, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('N', 0, -33)
  context.restore()
}

function niceScaleValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return [1, 2, 5, 10]
    .map((factor) => factor * magnitude)
    .reduce((best, candidate) =>
      Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best,
    )
}

function drawScaleBar(
  context: CanvasRenderingContext2D,
  frame: Frame,
  feetPerPixel: number,
  position: MapElementPositions['scale'],
) {
  const segments = 4
  const segmentFeet = niceScaleValue((140 * feetPerPixel) / segments)
  const totalPixels = (segmentFeet * segments) / feetPerPixel
  const segmentPixels = totalPixels / segments
  const padding = 12
  const barHeight = 10
  const fontSize = 17
  const width = totalPixels + padding * 2
  const height = 72
  const [x, y] = anchorBox(
    position.anchor,
    width,
    height,
    frame,
    18,
    position.offX,
    position.offY,
  )
  context.save()
  roundedRectangle(context, x, y, width, height, 7)
  context.fillStyle = 'rgba(255,255,255,0.88)'
  context.strokeStyle = 'rgba(12,25,44,0.25)'
  context.fill()
  context.stroke()
  const barX = x + padding
  const barY = y + 10
  for (let segment = 0; segment < segments; segment += 1) {
    if (segment % 2 === 0) {
      context.fillStyle = '#0c1a2d'
      context.fillRect(
        barX + segment * segmentPixels,
        barY,
        segmentPixels,
        barHeight,
      )
    }
  }
  context.strokeStyle = '#0c1a2d'
  context.strokeRect(barX, barY, totalPixels, barHeight)
  context.font = `${fontSize}px "Segoe UI", Arial, sans-serif`
  context.fillStyle = '#0c1a2d'
  context.textAlign = 'center'
  context.textBaseline = 'top'
  for (let index = 0; index <= segments; index += 1) {
    const markerX = barX + index * segmentPixels
    context.beginPath()
    context.moveTo(markerX, barY + barHeight)
    context.lineTo(markerX, barY + barHeight + 5)
    context.stroke()
    context.fillText(
      String(Math.round(index * segmentFeet)),
      markerX,
      barY + barHeight + 7,
    )
  }
  context.fillText(
    'ft (U.S. Survey)',
    barX + totalPixels / 2,
    barY + barHeight + 30,
  )
  context.restore()
}

function drawWetDryKey(
  context: CanvasRenderingContext2D,
  frame: Frame,
  settings: FigureSettings,
  position: MapElementPositions['wetDry'],
) {
  const fontSize = Math.max(12, settings.legendFontSize - 1)
  const padding = 12
  context.save()
  context.font = `700 ${fontSize + 1}px "Segoe UI", Arial, sans-serif`
  const width = Math.max(190, context.measureText('Wet/Dry Change').width + 24)
  const height = 92
  const [x, y] = anchorBox(
    position.anchor,
    width,
    height,
    frame,
    18,
    position.offX,
    position.offY,
  )
  roundedRectangle(context, x, y, width, height, 7)
  context.fillStyle = 'rgba(255,255,255,0.88)'
  context.strokeStyle = 'rgba(12,25,44,0.25)'
  context.fill()
  context.stroke()
  context.fillStyle = '#0d1c31'
  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.fillText('Wet/Dry Change', x + padding, y + padding)
  context.font = `${fontSize}px "Segoe UI", Arial, sans-serif`
  const rows = [
    ['Newly inundated', settings.newlyWetColor],
    ['Newly dry', settings.newlyDryColor],
  ]
  rows.forEach(([label, color], index) => {
    const rowY = y + 40 + index * 23
    context.fillStyle = color
    context.fillRect(x + padding, rowY, 24, 13)
    context.fillStyle = '#0d1c31'
    context.fillText(label, x + padding + 34, rowY - 2)
  })
  context.restore()
}

function resolveTitle(scene: WseDifferenceScene, template: string) {
  return template
    .replaceAll('{type}', 'WSE Difference Map')
    .replaceAll('{existing}', runDisplayName(scene.existing.run.name))
    .replaceAll('{proposed}', runDisplayName(scene.proposed.run.name))
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export async function renderWseDifferenceMap(
  canvas: HTMLCanvasElement,
  scene: WseDifferenceScene,
  commonBounds: Bounds,
  settings: FigureSettings,
  overlays: MapOverlay[],
  annotations: MapAnnotation[] = [],
  signal?: AbortSignal,
) {
  const frame = FRAMES[settings.orientation]
  canvas.width = frame.width
  canvas.height = frame.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not create the map canvas.')
  const view = makeView(commonBounds, frame, settings)
  const legendBound =
    settings.legendBound && settings.legendBound > 0
      ? settings.legendBound
      : scene.maxAbs

  context.clearRect(0, 0, frame.width, frame.height)
  context.fillStyle = '#dce4ec'
  context.fillRect(0, 0, frame.width, frame.height)
  await drawBasemap(context, view, settings.basemapOpacity, signal)

  context.save()
  context.translate(view.originX, view.originY)
  context.rotate(view.rotationRadians)
  const existingCoordinates = localCoordinates(scene.projected, view)
  fillMesh(
    context,
    existingCoordinates.localX,
    existingCoordinates.localY,
    scene.projected.tris,
    scene.diff,
    (value) => differenceColor(value, legendBound),
  )

  const proposedCoordinates = localCoordinates(scene.proposedProjected, view)
  if (settings.showWetDry) {
    fillWetDry(
      context,
      existingCoordinates.localX,
      existingCoordinates.localY,
      scene.projected.tris,
      scene.wetDry,
      settings,
    )
    fillWetDry(
      context,
      proposedCoordinates.localX,
      proposedCoordinates.localY,
      scene.proposedProjected.tris,
      scene.proposedWetDry,
      settings,
    )
  }
  if (settings.showContours) {
    drawContours(
      context,
      proposedCoordinates.localX,
      proposedCoordinates.localY,
      scene.proposedProjected.tris,
      scene.proposedWseWet,
      settings.contourInterval,
      settings.contourColor,
    )
  }
  if (settings.showOverlays) drawOverlays(context, overlays, view)
  context.restore()

  drawAnnotations(context, annotations, view)

  const positions = settings.elementPositions
  if (settings.showTitle) {
    drawTitle(
      context,
      resolveTitle(scene, settings.titleTemplate),
      frame,
      positions.title,
    )
  }
  if (settings.showLegend) {
    drawDifferenceLegend(
      context,
      legendBound,
      settings.legendInterval,
      settings.legendFontSize,
      frame,
      positions.diffLegend,
    )
  }
  if (settings.showNorth) {
    drawNorthArrow(
      context,
      frame,
      view.rotationRadians,
      positions.north,
    )
  }
  if (settings.showScale) {
    drawScaleBar(
      context,
      frame,
      scene.projected.ftPerMerc / view.scale,
      positions.scale,
    )
  }
  if (settings.showWetDry) {
    drawWetDryKey(context, frame, settings, positions.wetDry)
  }
}
