import type {
  Anchor,
  Bounds,
  DifferenceLegendElementStyle,
  ElementBoxStyle,
  FigureSettings,
  GeoJsonGeometry,
  MapAnnotation,
  MapCoordinate,
  MapElementBounds,
  MapElementKey,
  MapElementPositions,
  MapOverlay,
  NorthElementStyle,
  ProjectedGeometry,
  ResultLabelField,
  ScaleElementStyle,
  TitleElementStyle,
  WetDryElementStyle,
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

function differenceBandCount(
  maxAbsolute: number,
  interval: number | null,
) {
  return interval && interval > 0
    ? Math.max(1, Math.min(80, Math.round((2 * maxAbsolute) / interval)))
    : 8
}

function differenceBreaks(
  maxAbsolute: number,
  interval: number | null,
) {
  const bandCount = differenceBandCount(maxAbsolute, interval)
  return Array.from(
    { length: Math.max(0, bandCount - 1) },
    (_, index) =>
      -maxAbsolute + ((index + 1) * 2 * maxAbsolute) / bandCount,
  )
}

type ScalarVertex = {
  x: number
  y: number
  value: number
}

function clipScalarPolygon(
  polygon: ScalarVertex[],
  threshold: number,
  keepAbove: boolean,
) {
  if (!Number.isFinite(threshold) || polygon.length === 0) return polygon
  const output: ScalarVertex[] = []

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]
    const previous = polygon[(index + polygon.length - 1) % polygon.length]
    const currentInside = keepAbove
      ? current.value >= threshold
      : current.value <= threshold
    const previousInside = keepAbove
      ? previous.value >= threshold
      : previous.value <= threshold

    if (currentInside !== previousInside) {
      const fraction =
        (threshold - previous.value) / (current.value - previous.value)
      output.push({
        x: previous.x + (current.x - previous.x) * fraction,
        y: previous.y + (current.y - previous.y) * fraction,
        value: threshold,
      })
    }
    if (currentInside) output.push(current)
  }

  return output
}

function fillDifferenceBands(
  context: CanvasRenderingContext2D,
  localX: Float64Array,
  localY: Float64Array,
  triangles: Uint32Array,
  values: Float32Array,
  maxAbsolute: number,
  interval: number | null,
) {
  const bandCount = differenceBandCount(maxAbsolute, interval)
  const step = (2 * maxAbsolute) / bandCount

  for (let triangle = 0; triangle < triangles.length; triangle += 3) {
    const first = triangles[triangle]
    const second = triangles[triangle + 1]
    const third = triangles[triangle + 2]
    const valueA = values[first]
    const valueB = values[second]
    const valueC = values[third]
    if (!VALID(valueA) || !VALID(valueB) || !VALID(valueC)) continue
    const source: ScalarVertex[] = [
      { x: localX[first], y: localY[first], value: valueA },
      { x: localX[second], y: localY[second], value: valueB },
      { x: localX[third], y: localY[third], value: valueC },
    ]

    for (let band = 0; band < bandCount; band += 1) {
      const lower =
        band === 0 ? Number.NEGATIVE_INFINITY : -maxAbsolute + band * step
      const upper =
        band === bandCount - 1
          ? Number.POSITIVE_INFINITY
          : -maxAbsolute + (band + 1) * step
      let polygon = clipScalarPolygon(source, lower, true)
      polygon = clipScalarPolygon(polygon, upper, false)
      if (polygon.length < 3) continue
      const middle = -maxAbsolute + (band + 0.5) * step
      context.fillStyle = differenceColor(middle, maxAbsolute) ?? '#ffffff'
      context.beginPath()
      context.moveTo(polygon[0].x, polygon[0].y)
      for (let index = 1; index < polygon.length; index += 1) {
        context.lineTo(polygon[index].x, polygon[index].y)
      }
      context.closePath()
      context.fill()
    }
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

function drawContourLevels(
  context: CanvasRenderingContext2D,
  localX: Float64Array,
  localY: Float64Array,
  triangles: Uint32Array,
  values: Float32Array,
  levels: number[],
  color: string,
) {
  if (levels.length === 0) return
  context.save()
  context.strokeStyle = color
  context.lineWidth = 1.5
  context.globalAlpha = 0.9
  context.lineCap = 'round'
  context.lineJoin = 'round'

  for (const level of levels) {
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
          (firstValue <= level && secondValue > level) ||
          (secondValue <= level && firstValue > level)
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

function drawValidBoundary(
  context: CanvasRenderingContext2D,
  localX: Float64Array,
  localY: Float64Array,
  triangles: Uint32Array,
  values: Float32Array,
  color: string,
) {
  const edges = new Map<
    string,
    { first: number; second: number; count: number }
  >()

  for (let triangle = 0; triangle < triangles.length; triangle += 3) {
    const ids = [
      triangles[triangle],
      triangles[triangle + 1],
      triangles[triangle + 2],
    ]
    if (ids.some((id) => !VALID(values[id]))) continue
    for (let edge = 0; edge < 3; edge += 1) {
      const first = ids[edge]
      const second = ids[(edge + 1) % 3]
      const key =
        first < second ? `${first}:${second}` : `${second}:${first}`
      const current = edges.get(key)
      if (current) current.count += 1
      else edges.set(key, { first, second, count: 1 })
    }
  }

  context.save()
  context.strokeStyle = color
  context.lineWidth = 1.5
  context.globalAlpha = 0.9
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.beginPath()
  for (const edge of edges.values()) {
    if (edge.count !== 1) continue
    context.moveTo(localX[edge.first], localY[edge.first])
    context.lineTo(localX[edge.second], localY[edge.second])
  }
  context.stroke()
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
  const layout = annotationTextLayout(context, annotation, point)
  const { lines, lineHeight, paddingY, width, height, x, y } = layout
  context.save()

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

function annotationTextLayout(
  context: CanvasRenderingContext2D,
  annotation: MapAnnotation,
  point: { x: number; y: number },
) {
  const lines = (annotation.text.trim() || 'Note').split(/\r?\n/)
  const lineHeight = annotation.fontSize * 1.25
  const paddingX = 10
  const paddingY = 8
  context.font = `600 ${annotation.fontSize}px "Segoe UI", Arial, sans-serif`
  const width =
    Math.max(...lines.map((line) => context.measureText(line).width)) +
    paddingX * 2
  const height = lines.length * lineHeight + paddingY * 2
  const x = point.x - width / 2
  const y = point.y - height / 2
  return { lines, lineHeight, paddingY, width, height, x, y }
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
    }
    context.restore()
  }
}

function drawSelectionHandle(
  context: CanvasRenderingContext2D,
  point: { x: number; y: number },
) {
  context.save()
  context.setLineDash([])
  context.beginPath()
  context.arc(point.x, point.y, 8, 0, Math.PI * 2)
  context.fillStyle = '#ffffff'
  context.fill()
  context.strokeStyle = '#0877b9'
  context.lineWidth = 3
  context.stroke()
  context.restore()
}

function drawAnnotationSelection(
  context: CanvasRenderingContext2D,
  annotation: MapAnnotation,
  view: View,
) {
  const points = annotation.points.map((point) =>
    annotationScreenPoint(point, view),
  )
  if (points.length === 0) return

  context.save()
  context.strokeStyle = '#0877b9'
  context.lineWidth = 2
  context.setLineDash([8, 6])

  if (
    (annotation.kind === 'leader' || annotation.kind === 'result') &&
    points[1]
  ) {
    const layout = annotationTextLayout(context, annotation, points[1])
    roundedRectangle(
      context,
      layout.x - 5,
      layout.y - 5,
      layout.width + 10,
      layout.height + 10,
      7,
    )
    context.stroke()
    if (!annotation.hydraulicExtremum) {
      drawSelectionHandle(context, points[0])
    }
  } else if (annotation.kind === 'text') {
    const layout = annotationTextLayout(context, annotation, points[0])
    roundedRectangle(
      context,
      layout.x - 5,
      layout.y - 5,
      layout.width + 10,
      layout.height + 10,
      7,
    )
    context.stroke()
  } else {
    drawSelectionHandle(context, points[0])
    if (points[1]) drawSelectionHandle(context, points[1])
  }
  context.restore()
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

export type AnnotationHitPart = 'body' | 'segment' | 'start' | 'end'

export type AnnotationHit = {
  id: string
  part: AnnotationHitPart
}

export function moveAnnotationPoints(
  annotation: MapAnnotation,
  part: AnnotationHitPart,
  originalPoints: MapCoordinate[],
  dx: number,
  dy: number,
) {
  const points = originalPoints.map((point) => ({ ...point }))
  if (annotation.hydraulicExtremum) {
    if (part !== 'body' || !points[1]) return points
    points[1] = {
      x: points[1].x + dx,
      y: points[1].y + dy,
    }
    return points
  }
  const pointIndex =
    part === 'start'
      ? 0
      : part === 'end'
        ? 1
        : part === 'body' &&
            (annotation.kind === 'leader' || annotation.kind === 'result')
          ? 1
          : null

  if (pointIndex === null) {
    return points.map((point) => ({
      x: point.x + dx,
      y: point.y + dy,
    }))
  }
  if (!points[pointIndex]) return points
  points[pointIndex] = {
    x: points[pointIndex].x + dx,
    y: points[pointIndex].y + dy,
  }
  return points
}

function estimatedTextBox(annotation: MapAnnotation, point: MapCoordinate) {
  const lines = (annotation.text || 'Note').split(/\r?\n/)
  const width =
    Math.max(...lines.map((line) => line.length)) *
      annotation.fontSize *
      0.62 +
    24
  const height = lines.length * annotation.fontSize * 1.25 + 20
  return {
    left: point.x - width / 2,
    right: point.x + width / 2,
    top: point.y - height / 2,
    bottom: point.y + height / 2,
  }
}

export function hitTestAnnotation(
  annotations: MapAnnotation[],
  bounds: Bounds,
  settings: FigureSettings,
  x: number,
  y: number,
): AnnotationHit | null {
  const view = makeView(bounds, FRAMES[settings.orientation], settings)
  const pointer = { x, y }

  for (let index = annotations.length - 1; index >= 0; index -= 1) {
    const annotation = annotations[index]
    const points = annotation.points.map((point) =>
      annotationScreenPoint(point, view),
    )
    if (points.length === 0) continue

    if (annotation.kind === 'text') {
      const box = estimatedTextBox(annotation, points[0])
      if (
        x >= box.left &&
        x <= box.right &&
        y >= box.top &&
        y <= box.bottom
      ) {
        return { id: annotation.id, part: 'body' }
      }
      continue
    }
    if (
      (annotation.kind === 'leader' || annotation.kind === 'result') &&
      points[1]
    ) {
      if (Math.hypot(x - points[0].x, y - points[0].y) <= 16) {
        return { id: annotation.id, part: 'start' }
      }
      const box = estimatedTextBox(annotation, points[1])
      if (
        x >= box.left &&
        x <= box.right &&
        y >= box.top &&
        y <= box.bottom
      ) {
        return { id: annotation.id, part: 'body' }
      }
    }
    if (
      (annotation.kind === 'line' || annotation.kind === 'arrow') &&
      points[1]
    ) {
      if (Math.hypot(x - points[0].x, y - points[0].y) <= 16) {
        return { id: annotation.id, part: 'start' }
      }
      if (Math.hypot(x - points[1].x, y - points[1].y) <= 16) {
        return { id: annotation.id, part: 'end' }
      }
    }
    if (
      points[1] &&
      pointToSegmentDistance(pointer, points[0], points[1]) <=
        Math.max(10, annotation.lineWidth + 6)
    ) {
      return { id: annotation.id, part: 'segment' }
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
  const rawX =
    anchor === 'ml'
      ? margin + offX
      : anchor === 'mr'
        ? x.r + offX
        : x[anchor[1] as keyof typeof x] + offX
  const rawY =
    anchor === 'ml' || anchor === 'mr'
      ? y.m + offY
      : y[anchor[0] as keyof typeof y] + offY
  return [
    Math.max(0, Math.min(frame.width - width, rawX)),
    Math.max(0, Math.min(frame.height - height, rawY)),
  ] as const
}

function drawElementBox(
  context: CanvasRenderingContext2D,
  bounds: Omit<MapElementBounds, 'key'>,
  style: ElementBoxStyle,
) {
  context.save()
  roundedRectangle(context, bounds.x, bounds.y, bounds.width, bounds.height, 7)
  if (style.background) {
    context.globalAlpha = Math.max(0, Math.min(1, style.backgroundOpacity))
    context.fillStyle = style.backgroundColor
    context.fill()
    context.globalAlpha = 1
  }
  if (style.borderWidth > 0) {
    context.lineWidth = style.borderWidth
    context.strokeStyle = style.borderColor
    context.stroke()
  }
  context.restore()
}

function wrappedLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let line = words[0]
  for (const word of words.slice(1)) {
    const candidate = `${line} ${word}`
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate
    } else {
      lines.push(line)
      line = word
    }
  }
  lines.push(line)
  return lines
}

function drawTitle(
  context: CanvasRenderingContext2D,
  title: string,
  frame: Frame,
  position: MapElementPositions['title'],
  style: TitleElementStyle,
) {
  const padding = 15
  const lineHeight = Math.round(style.fontSize * 1.22)
  context.save()
  context.font = `${style.fontWeight} ${style.fontSize}px "Segoe UI", Arial, sans-serif`
  const maxTextWidth = Math.max(120, style.maxWidth - padding * 2)
  const lines = wrappedLines(context, title, maxTextWidth)
  const measuredWidth = Math.max(
    1,
    ...lines.map((line) => context.measureText(line).width),
  )
  const width = Math.min(style.maxWidth, measuredWidth + padding * 2)
  const height = lines.length * lineHeight + padding * 2
  const [x, y] = anchorBox(
    position.anchor,
    width,
    height,
    frame,
    18,
    position.offX,
    position.offY,
  )
  const bounds = { key: 'title', x, y, width, height } as const
  drawElementBox(context, bounds, style)
  context.fillStyle = style.textColor
  context.textAlign = style.alignment
  context.textBaseline = 'middle'
  const textX =
    style.alignment === 'left'
      ? x + padding
      : style.alignment === 'right'
        ? x + width - padding
        : x + width / 2
  lines.forEach((line, index) => {
    context.fillText(
      line,
      textX,
      y + padding + lineHeight * (index + 0.5),
      maxTextWidth,
    )
  })
  context.restore()
  return bounds
}

function formatLegendValue(value: number, decimalPlaces: number) {
  return value.toFixed(Math.max(0, Math.min(3, decimalPlaces)))
}

function legendTitle(style: DifferenceLegendElementStyle) {
  const title = style.title.trim()
  const units = style.units.trim()
  return units ? `${title} (${units})` : title
}

function drawDifferenceLegend(
  context: CanvasRenderingContext2D,
  maxAbsolute: number,
  interval: number | null,
  frame: Frame,
  position: MapElementPositions['diffLegend'],
  style: DifferenceLegendElementStyle,
) {
  const bandCount = differenceBandCount(maxAbsolute, interval)
  const padding = 12
  const title = legendTitle(style)
  const labels = Array.from({ length: bandCount + 1 }, (_, index) =>
    formatLegendValue(
      -maxAbsolute + (index * 2 * maxAbsolute) / bandCount,
      style.decimalPlaces,
    ),
  )
  const titleHeight = style.fontSize + 14
  context.save()
  context.font = `700 ${style.fontSize + 2}px "Segoe UI", Arial, sans-serif`
  const titleWidth = context.measureText(title).width
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  const labelWidth = Math.max(
    ...labels.map((label) => context.measureText(label).width),
  )

  let width: number
  let height: number
  if (style.orientation === 'horizontal') {
    const blockWidth = Math.max(style.swatchSize * 2, labelWidth + 36)
    width = Math.max(
      padding * 2 + titleWidth,
      padding * 2 + blockWidth * bandCount,
    )
    height = padding * 2 + titleHeight + style.swatchSize + style.fontSize + 14
  } else {
    const blockHeight = Math.max(style.swatchSize, style.fontSize + 4)
    const swatchWidth = Math.round(style.swatchSize * 1.7)
    width = Math.max(
      padding * 2 + titleWidth,
      padding * 2 + swatchWidth + 12 + labelWidth,
    )
    height =
      padding * 2 +
      titleHeight +
      bandCount * blockHeight +
      style.fontSize / 2
  }

  const [x, y] = anchorBox(
    position.anchor,
    width,
    height,
    frame,
    18,
    position.offX,
    position.offY,
  )
  const bounds = { key: 'diffLegend', x, y, width, height } as const
  drawElementBox(context, bounds, style)
  context.fillStyle = style.textColor
  context.font = `700 ${style.fontSize + 2}px "Segoe UI", Arial, sans-serif`
  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.fillText(title, x + padding, y + padding)

  const barX = x + padding
  const barTop = y + padding + titleHeight
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  context.strokeStyle = style.borderColor
  context.fillStyle = style.textColor
  if (style.orientation === 'horizontal') {
    const blockWidth = (width - padding * 2) / bandCount
    for (let band = 0; band < bandCount; band += 1) {
      const middle =
        -maxAbsolute + ((band + 0.5) * 2 * maxAbsolute) / bandCount
      context.fillStyle = differenceColor(middle, maxAbsolute) ?? '#fff'
      context.fillRect(
        barX + band * blockWidth,
        barTop,
        blockWidth,
        style.swatchSize,
      )
    }
    context.strokeRect(
      barX + 0.5,
      barTop + 0.5,
      width - padding * 2,
      style.swatchSize,
    )
    context.fillStyle = style.textColor
    context.textBaseline = 'top'
    labels.forEach((label, index) => {
      const labelX = barX + (index * (width - padding * 2)) / bandCount
      context.textAlign =
        index === 0 ? 'left' : index === bandCount ? 'right' : 'center'
      context.fillText(label, labelX, barTop + style.swatchSize + 7)
    })
  } else {
    const blockHeight = Math.max(style.swatchSize, style.fontSize + 4)
    const swatchWidth = Math.round(style.swatchSize * 1.7)
    const barHeight = bandCount * blockHeight
    const barBottom = barTop + barHeight
    for (let band = 0; band < bandCount; band += 1) {
      const middle =
        -maxAbsolute + ((band + 0.5) * 2 * maxAbsolute) / bandCount
      context.fillStyle = differenceColor(middle, maxAbsolute) ?? '#fff'
      context.fillRect(
        barX,
        barBottom - (band + 1) * blockHeight,
        swatchWidth,
        blockHeight,
      )
    }
    context.strokeRect(barX + 0.5, barTop + 0.5, swatchWidth, barHeight)
    context.fillStyle = style.textColor
    context.textAlign = 'left'
    context.textBaseline = 'middle'
    labels.forEach((label, index) => {
      const labelY = barBottom - index * blockHeight
      context.beginPath()
      context.moveTo(barX + swatchWidth, labelY)
      context.lineTo(barX + swatchWidth + 5, labelY)
      context.stroke()
      context.fillText(label, barX + swatchWidth + 9, labelY)
    })
  }
  context.restore()
  return bounds
}

function drawNorthArrow(
  context: CanvasRenderingContext2D,
  frame: Frame,
  rotationRadians: number,
  position: MapElementPositions['north'],
  style: NorthElementStyle,
) {
  const diameter = style.size
  const radius = diameter / 2
  const [x, y] = anchorBox(
    position.anchor,
    diameter,
    diameter,
    frame,
    18,
    position.offX,
    position.offY,
  )
  const bounds = { key: 'north', x, y, width: diameter, height: diameter } as const
  const centerX = x + radius
  const centerY = y + radius
  const rotation =
    style.rotationMode === 'true-north' ? rotationRadians : 0
  context.save()
  context.beginPath()
  context.arc(centerX, centerY, radius, 0, Math.PI * 2)
  if (style.background) {
    context.globalAlpha = Math.max(0, Math.min(1, style.backgroundOpacity))
    context.fillStyle = style.backgroundColor
    context.fill()
    context.globalAlpha = 1
  }
  if (style.borderWidth > 0) {
    context.lineWidth = style.borderWidth
    context.strokeStyle = style.borderColor
    context.stroke()
  }
  context.translate(centerX, centerY)
  context.rotate(rotation)
  context.fillStyle = style.color
  context.strokeStyle = style.color
  context.lineWidth = Math.max(2, diameter * 0.035)
  if (style.style === 'simple') {
    context.beginPath()
    context.moveTo(0, radius * 0.48)
    context.lineTo(0, -radius * 0.45)
    context.stroke()
    context.beginPath()
    context.moveTo(0, -radius * 0.62)
    context.lineTo(radius * 0.18, -radius * 0.28)
    context.lineTo(0, -radius * 0.36)
    context.lineTo(-radius * 0.18, -radius * 0.28)
    context.closePath()
    context.fill()
  } else if (style.style === 'compass') {
    context.beginPath()
    context.moveTo(0, -radius * 0.62)
    context.lineTo(radius * 0.16, 0)
    context.lineTo(0, radius * 0.5)
    context.lineTo(-radius * 0.16, 0)
    context.closePath()
    context.stroke()
    context.beginPath()
    context.moveTo(0, -radius * 0.62)
    context.lineTo(radius * 0.16, 0)
    context.lineTo(0, -radius * 0.08)
    context.closePath()
    context.fill()
    context.beginPath()
    context.moveTo(-radius * 0.48, 0)
    context.lineTo(radius * 0.48, 0)
    context.stroke()
  } else {
    context.beginPath()
    context.moveTo(0, -radius * 0.55)
    context.lineTo(radius * 0.34, radius * 0.5)
    context.lineTo(0, radius * 0.24)
    context.lineTo(-radius * 0.34, radius * 0.5)
    context.closePath()
    context.fill()
  }
  context.restore()

  if (style.showLabel) {
    const labelRadius = radius * 0.75
    const labelX = centerX + Math.sin(rotation) * labelRadius
    const labelY = centerY - Math.cos(rotation) * labelRadius
    context.save()
    context.fillStyle = style.color
    context.font = `700 ${Math.max(12, diameter * 0.2)}px "Segoe UI", Arial, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('N', labelX, labelY)
    context.restore()
  }
  return bounds
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
  style: ScaleElementStyle,
) {
  const unitFactors = {
    'us-survey-ft': 1,
    ft: 0.3048006096012192 / 0.3048,
    mi: 1 / 5280,
    m: 0.3048006096012192,
  }
  const unitLabels = {
    'us-survey-ft': 'ft (U.S. Survey)',
    ft: 'ft',
    mi: 'mi',
    m: 'm',
  }
  const unitsPerSurveyFoot = unitFactors[style.units]
  const divisions = Math.max(2, Math.min(6, Math.round(style.divisions)))
  const targetUnits = 170 * feetPerPixel * unitsPerSurveyFoot
  const totalUnits =
    style.lengthMode === 'manual'
      ? Math.max(0.0001, style.manualLength)
      : niceScaleValue(targetUnits)
  const totalFeet = totalUnits / unitsPerSurveyFoot
  const totalPixels = totalFeet / feetPerPixel
  const segmentPixels = totalPixels / divisions
  const padding = 12
  const barHeight = Math.max(8, Math.round(style.fontSize * 0.58))
  const width = totalPixels + padding * 2
  const height = barHeight + style.fontSize * 2 + padding * 2 + 14
  const [x, y] = anchorBox(
    position.anchor,
    width,
    height,
    frame,
    18,
    position.offX,
    position.offY,
  )
  const bounds = { key: 'scale', x, y, width, height } as const
  context.save()
  drawElementBox(context, bounds, style)
  const barX = x + padding
  const barY = y + padding
  context.strokeStyle = style.lineColor
  context.lineWidth = 1.5
  if (style.style === 'alternating') {
    for (let segment = 0; segment < divisions; segment += 1) {
      context.fillStyle =
        segment % 2 === 0 ? style.fillColor : style.backgroundColor
      context.fillRect(
        barX + segment * segmentPixels,
        barY,
        segmentPixels,
        barHeight,
      )
    }
    context.strokeRect(barX, barY, totalPixels, barHeight)
  } else {
    context.beginPath()
    context.moveTo(barX, barY + barHeight)
    context.lineTo(barX + totalPixels, barY + barHeight)
    context.stroke()
  }
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  context.fillStyle = style.textColor
  context.textAlign = 'center'
  context.textBaseline = 'top'
  for (let index = 0; index <= divisions; index += 1) {
    const markerX = barX + index * segmentPixels
    context.beginPath()
    context.moveTo(
      markerX,
      style.style === 'ticks' ? barY + barHeight - 5 : barY + barHeight,
    )
    context.lineTo(markerX, barY + barHeight + 5)
    context.stroke()
    context.fillText(
      ((index * totalUnits) / divisions).toFixed(style.decimalPlaces),
      markerX,
      barY + barHeight + 7,
    )
  }
  context.fillText(
    unitLabels[style.units],
    barX + totalPixels / 2,
    barY + barHeight + style.fontSize + 12,
  )
  context.restore()
  return bounds
}

function drawWetDryKey(
  context: CanvasRenderingContext2D,
  frame: Frame,
  settings: FigureSettings,
  position: MapElementPositions['wetDry'],
  style: WetDryElementStyle,
) {
  const padding = 12
  const swatchHeight = Math.max(10, Math.round(style.swatchSize * 0.55))
  const rows = [
    [style.wetLabel, settings.newlyWetColor],
    [style.dryLabel, settings.newlyDryColor],
  ] as const
  context.save()
  context.font = `700 ${style.fontSize + 1}px "Segoe UI", Arial, sans-serif`
  const titleWidth = context.measureText(style.title).width
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  const itemWidths = rows.map(
    ([label]) =>
      style.swatchSize + 10 + context.measureText(label).width,
  )
  const titleHeight = style.fontSize + 14
  const width =
    style.orientation === 'horizontal'
      ? Math.max(
          titleWidth + padding * 2,
          itemWidths.reduce((total, value) => total + value, 0) +
            padding * 2 +
            20,
        )
      : Math.max(titleWidth, ...itemWidths) + padding * 2
  const height =
    style.orientation === 'horizontal'
      ? padding * 2 + titleHeight + Math.max(style.fontSize, swatchHeight)
      : padding * 2 + titleHeight + rows.length * (style.fontSize + 8)
  const [x, y] = anchorBox(
    position.anchor,
    width,
    height,
    frame,
    18,
    position.offX,
    position.offY,
  )
  const bounds = { key: 'wetDry', x, y, width, height } as const
  drawElementBox(context, bounds, style)
  context.fillStyle = style.textColor
  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.font = `700 ${style.fontSize + 1}px "Segoe UI", Arial, sans-serif`
  context.fillText(style.title, x + padding, y + padding)
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  let rowX = x + padding
  rows.forEach(([label, color], index) => {
    const rowY =
      y +
      padding +
      titleHeight +
      (style.orientation === 'vertical' ? index * (style.fontSize + 8) : 0)
    context.fillStyle = color
    context.fillRect(rowX, rowY, style.swatchSize, swatchHeight)
    context.fillStyle = style.textColor
    context.fillText(
      label,
      rowX + style.swatchSize + 10,
      rowY + (swatchHeight - style.fontSize) / 2,
    )
    if (style.orientation === 'horizontal') {
      rowX += itemWidths[index] + 20
    }
  })
  context.restore()
  return bounds
}

function resolveTitle(scene: WseDifferenceScene, template: string) {
  return template
    .replaceAll('{type}', 'WSE Difference Map')
    .replaceAll('{existing}', runDisplayName(scene.existing.run.name))
    .replaceAll('{proposed}', runDisplayName(scene.proposed.run.name))
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function drawMapElementSelection(
  context: CanvasRenderingContext2D,
  bounds: MapElementBounds,
) {
  context.save()
  context.strokeStyle = '#1682cf'
  context.lineWidth = 2
  context.setLineDash([7, 5])
  context.strokeRect(
    bounds.x - 4,
    bounds.y - 4,
    bounds.width + 8,
    bounds.height + 8,
  )
  context.restore()
}

export async function renderWseDifferenceMap(
  canvas: HTMLCanvasElement,
  scene: WseDifferenceScene,
  commonBounds: Bounds,
  settings: FigureSettings,
  overlays: MapOverlay[],
  annotations: MapAnnotation[] = [],
  selectedAnnotationId: string | null = null,
  selectedElementKey: MapElementKey | null = null,
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
  fillDifferenceBands(
    context,
    existingCoordinates.localX,
    existingCoordinates.localY,
    scene.projected.tris,
    scene.diff,
    legendBound,
    settings.legendInterval,
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
  if (settings.showDifferenceOutlines) {
    drawContourLevels(
      context,
      existingCoordinates.localX,
      existingCoordinates.localY,
      scene.projected.tris,
      scene.diff,
      differenceBreaks(legendBound, settings.legendInterval),
      settings.differenceOutlineColor,
    )
    drawValidBoundary(
      context,
      existingCoordinates.localX,
      existingCoordinates.localY,
      scene.projected.tris,
      scene.diff,
      settings.differenceOutlineColor,
    )
  }
  if (settings.showOverlays) drawOverlays(context, overlays, view)
  context.restore()

  drawAnnotations(context, annotations, view)
  const selectedAnnotation = annotations.find(
    (annotation) => annotation.id === selectedAnnotationId,
  )
  if (selectedAnnotation) {
    drawAnnotationSelection(context, selectedAnnotation, view)
  }

  const positions = settings.elementPositions
  const styles = settings.elementStyles
  const elementBounds: MapElementBounds[] = []
  if (settings.showTitle) {
    elementBounds.push(
      drawTitle(
        context,
        resolveTitle(scene, settings.titleTemplate),
        frame,
        positions.title,
        styles.title,
      ),
    )
  }
  if (settings.showLegend) {
    elementBounds.push(
      drawDifferenceLegend(
        context,
        legendBound,
        settings.legendInterval,
        frame,
        positions.diffLegend,
        styles.diffLegend,
      ),
    )
  }
  if (settings.showNorth) {
    elementBounds.push(
      drawNorthArrow(
        context,
        frame,
        view.rotationRadians,
        positions.north,
        styles.north,
      ),
    )
  }
  if (settings.showScale) {
    elementBounds.push(
      drawScaleBar(
        context,
        frame,
        scene.projected.ftPerMerc / view.scale,
        positions.scale,
        styles.scale,
      ),
    )
  }
  if (settings.showWetDry && settings.showWetDryKey) {
    elementBounds.push(
      drawWetDryKey(
        context,
        frame,
        settings,
        positions.wetDry,
        styles.wetDry,
      ),
    )
  }
  const selectedElement = elementBounds.find(
    (bounds) => bounds.key === selectedElementKey,
  )
  if (selectedElement) {
    drawMapElementSelection(context, selectedElement)
  }
  return elementBounds
}
