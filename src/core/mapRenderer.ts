import type {
  AssessmentMapLayer,
  Anchor,
  Bounds,
  CenterlineStationLayer,
  CenterlineStationTick,
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
  ScaleElementStyle,
  TitleElementStyle,
  WetDryElementStyle,
  WseAssessmentLine,
  WseDifferenceScene,
} from './types'
import { formatStation } from './centerlineStationing'
import { runDisplayName } from './hydraulicEngine'
import type { AnnotationHitPart } from './map/annotationGeometry'
import {
  differenceBandCount,
  differenceBreaks,
  differenceColor,
  drawContourLevels,
  drawValidBoundary,
  fillDifferenceBands,
  fillWetDry,
  hexToRgba,
  localCoordinates,
} from './map/hydraulicLayers'
import {
  FRAMES,
  makeMapView as makeView,
  type MapFrame as Frame,
  type MapView as View,
} from './map/view'

export {
  duplicateAnnotation,
  moveAnnotationPoints,
  type AnnotationHitPart,
} from './map/annotationGeometry'
export {
  formatHydraulicResultLabel,
  sampleHydraulicResult,
  type HydraulicResultSample,
} from './map/hydraulicSampling'
export {
  canvasPointToMap,
  DEFAULT_ELEMENT_POSITIONS,
  FRAMES,
  mapPointToCanvas,
} from './map/view'

const EARTH_RADIUS = 6_378_137
const EARTH_CIRCUMFERENCE = 2 * Math.PI * EARTH_RADIUS
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

const TILE_CACHE_LIMIT = 256
const tileBlobCache = new Map<string, Promise<Blob | null>>()

function cachedTileBlob(url: string) {
  const cached = tileBlobCache.get(url)
  if (cached) return cached

  const request = fetch(url, { mode: 'cors' })
    .then((response) => (response.ok ? response.blob() : null))
    .catch(() => null)
    .then((blob) => {
      if (!blob) tileBlobCache.delete(url)
      return blob
    })
  tileBlobCache.set(url, request)

  while (tileBlobCache.size > TILE_CACHE_LIMIT) {
    const oldest = tileBlobCache.keys().next().value
    if (!oldest) break
    tileBlobCache.delete(oldest)
  }
  return request
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
    const blob = await cachedTileBlob(url)
    if (!blob || signal?.aborted) return null
    const bitmap = await createImageBitmap(blob)
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

function drawAssessmentLines(
  context: CanvasRenderingContext2D,
  lines: WseAssessmentLine[],
  view: View,
  color: string,
  width: number,
) {
  if (lines.length === 0) return
  context.save()
  context.strokeStyle = color
  context.lineWidth = width
  context.lineCap = 'round'
  context.lineJoin = 'round'
  for (const line of lines) {
    if (line.points.length < 2) continue
    context.beginPath()
    line.points.forEach((point, index) => {
      const [x, y] = view.toLocal(point.x, point.y)
      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    })
    context.stroke()
  }
  context.restore()
}

function drawAssessmentSelection(
  context: CanvasRenderingContext2D,
  line: WseAssessmentLine | null | undefined,
  view: View,
  width: number,
) {
  if (!line || line.points.length < 2) return
  context.save()
  context.strokeStyle = 'rgba(255, 255, 255, 0.94)'
  context.lineWidth = Math.max(width + 7, 9)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.beginPath()
  line.points.forEach((point, index) => {
    const [x, y] = view.toLocal(point.x, point.y)
    if (index === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  })
  context.stroke()
  context.strokeStyle = '#0077b6'
  context.lineWidth = Math.max(width + 3, 5)
  context.stroke()
  context.restore()
}

type AssessmentCalloutLayout = {
  lineId: string
  text: string
  targetX: number
  targetY: number
  labelX: number
  labelY: number
  labelPoint: MapCoordinate
  x: number
  y: number
  width: number
  height: number
}

function layoutAssessmentCallouts(
  layer: AssessmentMapLayer,
  view: View,
  settings: FigureSettings,
  frame: Frame,
  measureText: (text: string) => number,
) {
  const layouts: AssessmentCalloutLayout[] = []
  const placedBoxes: { x: number; y: number; width: number; height: number }[] =
    []
  const callouts = layer.wseCallouts ?? []
  const paddingX = 7
  const paddingY = 4

  callouts.forEach((callout, index) => {
    const [targetX, targetY] = view.toScreen(
      callout.target.x,
      callout.target.y,
    )
    const width = measureText(callout.text) + paddingX * 2
    const height = settings.assessmentLabelFontSize + paddingY * 2
    let labelX = targetX
    let labelY = targetY
    let box = { x: 0, y: 0, width, height }

    if (callout.labelPoint) {
      ;[labelX, labelY] = view.toScreen(
        callout.labelPoint.x,
        callout.labelPoint.y,
      )
      box = {
        x: labelX - width / 2,
        y: labelY - height / 2,
        width,
        height,
      }
    } else {
      const [tangentX, tangentY] = view.toScreen(
        callout.target.x + callout.tangent.x,
        callout.target.y + callout.tangent.y,
      )
      const dx = tangentX - targetX
      const dy = tangentY - targetY
      const length = Math.hypot(dx, dy) || 1
      const preferredSide =
        settings.assessmentLabelSide === 'left'
          ? 1
          : settings.assessmentLabelSide === 'right'
            ? -1
            : index % 2 === 0
              ? 1
              : -1
      let placed = false
      for (let attempt = 0; attempt < 10 && !placed; attempt += 1) {
        const side =
          attempt % 2 === 0 ? preferredSide : -preferredSide
        const step = Math.floor(attempt / 2)
        const offset =
          (settings.assessmentLabelOffset + step * (height + 5)) *
          side
        labelX = targetX + (-dy / length) * offset
        labelY = targetY + (dx / length) * offset
        box = {
          x: labelX - width / 2,
          y: labelY - height / 2,
          width,
          height,
        }
        const insideFrame =
          box.x >= 4 &&
          box.y >= 4 &&
          box.x + box.width <= frame.width - 4 &&
          box.y + box.height <= frame.height - 4
        const overlaps = placedBoxes.some(
          (other) =>
            box.x < other.x + other.width + 4 &&
            box.x + box.width + 4 > other.x &&
            box.y < other.y + other.height + 4 &&
            box.y + box.height + 4 > other.y,
        )
        placed = insideFrame && !overlaps
      }
    }

    placedBoxes.push(box)
    layouts.push({
      lineId: callout.lineId,
      text: callout.text,
      targetX,
      targetY,
      labelX,
      labelY,
      labelPoint:
        callout.labelPoint ?? view.screenToMerc(labelX, labelY),
      ...box,
    })
  })
  return layouts
}

function leaderBoxEdge(layout: AssessmentCalloutLayout) {
  const dx = layout.targetX - layout.labelX
  const dy = layout.targetY - layout.labelY
  if (dx === 0 && dy === 0) {
    return { x: layout.labelX, y: layout.labelY }
  }
  const scale = 1 / Math.max(
    Math.abs(dx) / Math.max(layout.width / 2, 1),
    Math.abs(dy) / Math.max(layout.height / 2, 1),
  )
  return {
    x: layout.labelX + dx * scale,
    y: layout.labelY + dy * scale,
  }
}

function drawAssessmentCallouts(
  context: CanvasRenderingContext2D,
  layer: AssessmentMapLayer,
  view: View,
  settings: FigureSettings,
  frame: Frame,
) {
  if (!settings.showAssessmentLabels) return
  context.save()
  context.font = `600 ${settings.assessmentLabelFontSize}px Arial, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineWidth = 1
  const layouts = layoutAssessmentCallouts(
    layer,
    view,
    settings,
    frame,
    (text) => context.measureText(text).width,
  )

  for (const layout of layouts) {
    const edge = leaderBoxEdge(layout)
    context.strokeStyle = 'rgba(61, 78, 94, 0.82)'
    context.beginPath()
    context.moveTo(layout.targetX, layout.targetY)
    context.lineTo(edge.x, edge.y)
    context.stroke()

    context.fillStyle = 'rgba(255, 255, 255, 0.92)'
    context.beginPath()
    context.roundRect(
      layout.x,
      layout.y,
      layout.width,
      layout.height,
      3,
    )
    context.fill()
    context.stroke()
    context.fillStyle = settings.assessmentLabelColor
    context.fillText(layout.text, layout.labelX, layout.labelY + 0.5)

    if (layout.lineId === layer.selectedCalloutId) {
      context.save()
      context.strokeStyle = '#0877b9'
      context.lineWidth = 2
      context.setLineDash([6, 4])
      context.strokeRect(
        layout.x - 3,
        layout.y - 3,
        layout.width + 6,
        layout.height + 6,
      )
      context.restore()
    }
  }
  context.restore()
}

function drawAssessmentReviewMarkers(
  context: CanvasRenderingContext2D,
  layer: AssessmentMapLayer,
  view: View,
) {
  context.save()
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '700 14px Arial, sans-serif'

  if (layer.endpoints) {
    ;(['a', 'b'] as const).forEach((key) => {
      const point = layer.endpoints?.[key]
      if (!point) return
      const [x, y] = view.toScreen(point.x, point.y)
      context.fillStyle = '#ffffff'
      context.strokeStyle = '#0067a3'
      context.lineWidth = 3
      context.beginPath()
      context.arc(x, y, 13, 0, Math.PI * 2)
      context.fill()
      context.stroke()
      context.fillStyle = '#06466c'
      context.fillText(key.toUpperCase(), x, y + 0.5)
    })
  }

  for (const marker of layer.intersections ?? []) {
    const [x, y] = view.toScreen(marker.point.x, marker.point.y)
    context.fillStyle = marker.selected ? '#0077b6' : '#ffffff'
    context.strokeStyle = '#0077b6'
    context.lineWidth = 2
    context.beginPath()
    context.arc(x, y, 11, 0, Math.PI * 2)
    context.fill()
    context.stroke()
    context.fillStyle = marker.selected ? '#ffffff' : '#06466c'
    context.fillText(String(marker.index + 1), x, y + 0.5)
  }
  context.restore()
}

type StationLabelLayout = {
  id: string
  text: string
  targetX: number
  targetY: number
  labelX: number
  labelY: number
  labelPoint: MapCoordinate
  width: number
  height: number
  angle: number
  collisionBox: {
    x: number
    y: number
    width: number
    height: number
  }
  moved: boolean
}

function normalizedTextAngle(angle: number) {
  let result = angle
  while (result > Math.PI) result -= Math.PI * 2
  while (result < -Math.PI) result += Math.PI * 2
  if (result > Math.PI / 2) result -= Math.PI
  if (result < -Math.PI / 2) result += Math.PI
  return result
}

function stationLabelText(
  tick: CenterlineStationTick,
  settings: FigureSettings,
) {
  const override = settings.centerlineStationing.overrides[tick.id]
  return (
    override?.text ??
    `${settings.centerlineStationing.prefix}${formatStation(
      tick.stationFeet,
      settings.centerlineStationing.decimalPlaces,
    )}`
  )
}

function stationLabelLayouts(
  layer: CenterlineStationLayer,
  view: View,
  settings: FigureSettings,
  frame: Frame,
  measureText: (text: string) => number,
) {
  const stationing = settings.centerlineStationing
  const layouts: StationLabelLayout[] = []
  const placedBoxes: StationLabelLayout['collisionBox'][] = []

  layer.ticks
    .filter(
      (tick) =>
        tick.label &&
        stationing.overrides[tick.id]?.visible !== false,
    )
    .forEach((tick, index) => {
      const [targetX, targetY] = view.toScreen(
        tick.mapPoint.x,
        tick.mapPoint.y,
      )
      const [tangentX, tangentY] = view.toScreen(
        tick.mapPoint.x + tick.mapTangent.x,
        tick.mapPoint.y + tick.mapTangent.y,
      )
      const dx = tangentX - targetX
      const dy = tangentY - targetY
      const tangentLength = Math.hypot(dx, dy) || 1
      const normalX = -dy / tangentLength
      const normalY = dx / tangentLength
      const text = stationLabelText(tick, settings)
      const width = measureText(text) + 8
      const height = stationing.labelFontSize + 8
      const angle =
        stationing.labelOrientation === 'aligned'
          ? normalizedTextAngle(Math.atan2(dy, dx))
          : 0
      const rotatedWidth =
        Math.abs(Math.cos(angle)) * width +
        Math.abs(Math.sin(angle)) * height
      const rotatedHeight =
        Math.abs(Math.sin(angle)) * width +
        Math.abs(Math.cos(angle)) * height
      const override = stationing.overrides[tick.id]
      let labelX = targetX
      let labelY = targetY
      let collisionBox = {
        x: targetX - rotatedWidth / 2,
        y: targetY - rotatedHeight / 2,
        width: rotatedWidth,
        height: rotatedHeight,
      }

      if (override?.labelPoint) {
        ;[labelX, labelY] = view.toScreen(
          override.labelPoint.x,
          override.labelPoint.y,
        )
        collisionBox = {
          x: labelX - rotatedWidth / 2,
          y: labelY - rotatedHeight / 2,
          width: rotatedWidth,
          height: rotatedHeight,
        }
      } else {
        const preferredSide =
          stationing.labelSide === 'left'
            ? 1
            : stationing.labelSide === 'right'
              ? -1
              : index % 2 === 0
                ? 1
                : -1
        const sideAttempts =
          stationing.labelSide === 'auto'
            ? 12
            : stationing.labelSide === 'alternate'
              ? 8
              : 5
        let placed = false
        for (let attempt = 0; attempt < sideAttempts && !placed; attempt += 1) {
          const canFlip =
            stationing.labelSide === 'auto' ||
            stationing.labelSide === 'alternate'
          const side =
            canFlip && attempt % 2 === 1
              ? -preferredSide
              : preferredSide
          const step = canFlip ? Math.floor(attempt / 2) : attempt
          const offset =
            stationing.labelOffset + step * (stationing.labelFontSize + 6)
          labelX = targetX + normalX * offset * side
          labelY = targetY + normalY * offset * side
          collisionBox = {
            x: labelX - rotatedWidth / 2,
            y: labelY - rotatedHeight / 2,
            width: rotatedWidth,
            height: rotatedHeight,
          }
          const insideFrame =
            collisionBox.x >= 6 &&
            collisionBox.y >= 6 &&
            collisionBox.x + collisionBox.width <= frame.width - 6 &&
            collisionBox.y + collisionBox.height <= frame.height - 6
          const overlaps = placedBoxes.some(
            (other) =>
              collisionBox.x < other.x + other.width + 5 &&
              collisionBox.x + collisionBox.width + 5 > other.x &&
              collisionBox.y < other.y + other.height + 5 &&
              collisionBox.y + collisionBox.height + 5 > other.y,
          )
          placed = insideFrame && !overlaps
        }
        if (!placed) {
          labelX = Math.max(
            rotatedWidth / 2 + 6,
            Math.min(frame.width - rotatedWidth / 2 - 6, labelX),
          )
          labelY = Math.max(
            rotatedHeight / 2 + 6,
            Math.min(frame.height - rotatedHeight / 2 - 6, labelY),
          )
          collisionBox = {
            x: labelX - rotatedWidth / 2,
            y: labelY - rotatedHeight / 2,
            width: rotatedWidth,
            height: rotatedHeight,
          }
        }
      }

      placedBoxes.push(collisionBox)
      layouts.push({
        id: tick.id,
        text,
        targetX,
        targetY,
        labelX,
        labelY,
        labelPoint:
          override?.labelPoint ?? view.screenToMerc(labelX, labelY),
        width,
        height,
        angle,
        collisionBox,
        moved: Boolean(override?.labelPoint),
      })
    })

  return layouts
}

function drawStationTick(
  context: CanvasRenderingContext2D,
  tick: CenterlineStationTick,
  layer: CenterlineStationLayer,
  view: View,
  settings: FigureSettings,
) {
  const stationing = settings.centerlineStationing
  const useMajor = tick.major && stationing.showMajorTicks
  const useMinor = tick.minor && stationing.showMinorTicks
  if (!useMajor && !useMinor) return

  const [x, y] = view.toScreen(tick.mapPoint.x, tick.mapPoint.y)
  const [tx, ty] = view.toScreen(
    tick.mapPoint.x + tick.mapTangent.x,
    tick.mapPoint.y + tick.mapTangent.y,
  )
  const dx = tx - x
  const dy = ty - y
  const length = Math.hypot(dx, dy) || 1
  const normalX = -dy / length
  const normalY = dx / length
  const tickLength = useMajor
    ? stationing.majorTickLength
    : stationing.minorTickLength
  const negativeLength =
    stationing.tickSide === 'left'
      ? 0
      : stationing.tickSide === 'both'
        ? tickLength / 2
        : tickLength
  const positiveLength =
    stationing.tickSide === 'right'
      ? 0
      : stationing.tickSide === 'both'
        ? tickLength / 2
        : tickLength

  context.strokeStyle = stationing.tickColor
  context.lineWidth = useMajor
    ? stationing.majorLineWidth
    : stationing.minorLineWidth
  context.beginPath()
  context.moveTo(
    x - normalX * negativeLength,
    y - normalY * negativeLength,
  )
  context.lineTo(
    x + normalX * positiveLength,
    y + normalY * positiveLength,
  )
  context.stroke()

  if (
    layer.selectedLabelId === tick.id &&
    !tick.label
  ) {
    context.fillStyle = '#0877b9'
    context.beginPath()
    context.arc(x, y, 4, 0, Math.PI * 2)
    context.fill()
  }
}

function drawStationingGuides(
  context: CanvasRenderingContext2D,
  layer: CenterlineStationLayer,
  view: View,
  settings: FigureSettings,
) {
  const stationing = settings.centerlineStationing
  if (stationing.showEndpoints) {
    const endpoints = [
      { label: 'A', point: layer.centerline.mapPoints[0] },
      { label: 'B', point: layer.centerline.mapPoints.at(-1)! },
    ]
    context.save()
    context.font = '700 14px Arial, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    for (const endpoint of endpoints) {
      const [x, y] = view.toScreen(endpoint.point.x, endpoint.point.y)
      context.fillStyle = '#ffffff'
      context.strokeStyle = stationing.tickColor
      context.lineWidth = 2
      context.beginPath()
      context.arc(x, y, 12, 0, Math.PI * 2)
      context.fill()
      context.stroke()
      context.fillStyle = stationing.labelColor
      context.fillText(endpoint.label, x, y + 0.5)
    }
    context.restore()
  }

  if (stationing.showDirectionArrow && layer.ticks.length > 0) {
    const tick = layer.ticks[Math.floor(layer.ticks.length / 2)]
    const [x, y] = view.toScreen(tick.mapPoint.x, tick.mapPoint.y)
    const [tx, ty] = view.toScreen(
      tick.mapPoint.x + tick.mapTangent.x,
      tick.mapPoint.y + tick.mapTangent.y,
    )
    const dx = tx - x
    const dy = ty - y
    const length = Math.hypot(dx, dy) || 1
    const ux = dx / length
    const uy = dy / length
    const startX = x - ux * 18
    const startY = y - uy * 18
    const endX = x + ux * 18
    const endY = y + uy * 18
    context.save()
    context.strokeStyle = stationing.tickColor
    context.fillStyle = stationing.tickColor
    context.lineWidth = 3
    context.lineCap = 'round'
    context.beginPath()
    context.moveTo(startX, startY)
    context.lineTo(endX, endY)
    context.stroke()
    context.beginPath()
    context.moveTo(endX, endY)
    context.lineTo(endX - ux * 11 - uy * 6, endY - uy * 11 + ux * 6)
    context.lineTo(endX - ux * 11 + uy * 6, endY - uy * 11 - ux * 6)
    context.closePath()
    context.fill()
    context.restore()
  }
}

function drawCenterlineStationing(
  context: CanvasRenderingContext2D,
  layer: CenterlineStationLayer | undefined,
  view: View,
  settings: FigureSettings,
  frame: Frame,
) {
  const stationing = settings.centerlineStationing
  if (!layer || !stationing.visible) return
  context.save()
  context.lineCap = 'round'
  for (const tick of layer.ticks) {
    drawStationTick(context, tick, layer, view, settings)
  }
  drawStationingGuides(context, layer, view, settings)

  if (stationing.showLabels) {
    context.font = `600 ${stationing.labelFontSize}px Arial, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    const layouts = stationLabelLayouts(
      layer,
      view,
      settings,
      frame,
      (text) => context.measureText(text).width,
    )
    for (const layout of layouts) {
      if (layout.moved) {
        context.strokeStyle = stationing.tickColor
        context.lineWidth = Math.max(1, stationing.minorLineWidth)
        context.beginPath()
        context.moveTo(layout.targetX, layout.targetY)
        context.lineTo(layout.labelX, layout.labelY)
        context.stroke()
      }

      context.save()
      context.translate(layout.labelX, layout.labelY)
      context.rotate(layout.angle)
      if (stationing.labelHalo) {
        context.strokeStyle = 'rgba(255, 255, 255, 0.96)'
        context.lineWidth = 5
        context.lineJoin = 'round'
        context.strokeText(layout.text, 0, 0)
      }
      context.fillStyle = stationing.labelColor
      context.fillText(layout.text, 0, 0)
      if (layout.id === layer.selectedLabelId) {
        context.strokeStyle = '#0877b9'
        context.lineWidth = 2
        context.setLineDash([6, 4])
        context.strokeRect(
          -layout.width / 2 - 3,
          -layout.height / 2 - 3,
          layout.width + 6,
          layout.height + 6,
        )
      }
      context.restore()
    }
  }
  context.restore()
}

function assessmentMapLayer(
  input: AssessmentMapLayer | WseAssessmentLine[],
): AssessmentMapLayer {
  return Array.isArray(input) ? { lines: input } : input
}

function annotationScreenPoint(point: MapCoordinate, view: View) {
  const [x, y] = view.toScreen(point.x, point.y)
  return { x, y }
}

function annotationRotationRadians(annotation: MapAnnotation) {
  return (((annotation.rotation ?? 0) % 360) * Math.PI) / 180
}

function rotateAnnotationContext(
  context: CanvasRenderingContext2D,
  annotation: MapAnnotation,
  point: { x: number; y: number },
) {
  context.translate(point.x, point.y)
  context.rotate(annotationRotationRadians(annotation))
  context.translate(-point.x, -point.y)
}

function annotationTextBox(
  context: CanvasRenderingContext2D,
  annotation: MapAnnotation,
  point: { x: number; y: number },
) {
  const layout = annotationTextLayout(context, annotation, point)
  const { lines, lineHeight, paddingY, width, height, x, y } = layout
  context.save()
  rotateAnnotationContext(context, annotation, point)

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
    context.save()
    rotateAnnotationContext(context, annotation, points[1])
    roundedRectangle(
      context,
      layout.x - 5,
      layout.y - 5,
      layout.width + 10,
      layout.height + 10,
      7,
    )
    context.stroke()
    context.restore()
    if (!annotation.hydraulicExtremum) {
      drawSelectionHandle(context, points[0])
    }
  } else if (annotation.kind === 'text') {
    const layout = annotationTextLayout(context, annotation, points[0])
    context.save()
    rotateAnnotationContext(context, annotation, points[0])
    roundedRectangle(
      context,
      layout.x - 5,
      layout.y - 5,
      layout.width + 10,
      layout.height + 10,
      7,
    )
    context.stroke()
    context.restore()
  } else {
    drawSelectionHandle(context, points[0])
    if (points[1]) drawSelectionHandle(context, points[1])
  }
  context.restore()
}

export type AssessmentCalloutHit = {
  lineId: string
  labelPoint: MapCoordinate
}

export function hitTestAssessmentCallout(
  layer: AssessmentMapLayer,
  bounds: Bounds,
  settings: FigureSettings,
  x: number,
  y: number,
): AssessmentCalloutHit | null {
  if (!settings.showAssessmentLabels) return null
  const frame = FRAMES[settings.orientation]
  const view = makeView(bounds, frame, settings)
  const layouts = layoutAssessmentCallouts(
    layer,
    view,
    settings,
    frame,
    (text) => text.length * settings.assessmentLabelFontSize * 0.62,
  )
  for (let index = layouts.length - 1; index >= 0; index -= 1) {
    const layout = layouts[index]
    if (
      x >= layout.x - 4 &&
      x <= layout.x + layout.width + 4 &&
      y >= layout.y - 4 &&
      y <= layout.y + layout.height + 4
    ) {
      return {
        lineId: layout.lineId,
        labelPoint: layout.labelPoint,
      }
    }
  }
  return null
}

export type StationLabelHit = {
  id: string
  labelPoint: MapCoordinate
}

export function hitTestStationLabel(
  layer: CenterlineStationLayer | undefined,
  bounds: Bounds,
  settings: FigureSettings,
  x: number,
  y: number,
): StationLabelHit | null {
  if (
    !layer ||
    !settings.centerlineStationing.visible ||
    !settings.centerlineStationing.showLabels
  ) {
    return null
  }
  const frame = FRAMES[settings.orientation]
  const view = makeView(bounds, frame, settings)
  const layouts = stationLabelLayouts(
    layer,
    view,
    settings,
    frame,
    (text) =>
      text.length * settings.centerlineStationing.labelFontSize * 0.62,
  )
  for (let index = layouts.length - 1; index >= 0; index -= 1) {
    const layout = layouts[index]
    const dx = x - layout.labelX
    const dy = y - layout.labelY
    const cosine = Math.cos(-layout.angle)
    const sine = Math.sin(-layout.angle)
    const localX = dx * cosine - dy * sine
    const localY = dx * sine + dy * cosine
    if (
      Math.abs(localX) <= layout.width / 2 + 5 &&
      Math.abs(localY) <= layout.height / 2 + 5
    ) {
      return {
        id: layout.id,
        labelPoint: layout.labelPoint,
      }
    }
  }
  return null
}

export function stationLabelPosition(
  layer: CenterlineStationLayer | undefined,
  bounds: Bounds,
  settings: FigureSettings,
  id: string,
) {
  if (!layer) return null
  const frame = FRAMES[settings.orientation]
  const view = makeView(bounds, frame, settings)
  const layout = stationLabelLayouts(
    layer,
    view,
    settings,
    frame,
    (text) =>
      text.length * settings.centerlineStationing.labelFontSize * 0.62,
  ).find((item) => item.id === id)
  return layout?.labelPoint ?? null
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

export type AnnotationHit = {
  id: string
  part: AnnotationHitPart
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

function pointInAnnotationTextBox(
  annotation: MapAnnotation,
  point: { x: number; y: number },
  labelPoint: { x: number; y: number },
) {
  const angle = -annotationRotationRadians(annotation)
  const dx = point.x - labelPoint.x
  const dy = point.y - labelPoint.y
  const localPoint = {
    x: labelPoint.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: labelPoint.y + dx * Math.sin(angle) + dy * Math.cos(angle),
  }
  const box = estimatedTextBox(annotation, labelPoint)
  return (
    localPoint.x >= box.left &&
    localPoint.x <= box.right &&
    localPoint.y >= box.top &&
    localPoint.y <= box.bottom
  )
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
      if (pointInAnnotationTextBox(annotation, pointer, points[0])) {
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
      if (pointInAnnotationTextBox(annotation, pointer, points[1])) {
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
    .replaceAll('{baseline}', scene.existing.condition.label)
    .replaceAll('{comparison}', scene.proposed.condition.label)
    .replaceAll('{baselineRun}', runDisplayName(scene.existing.run.name))
    .replaceAll('{comparisonRun}', runDisplayName(scene.proposed.run.name))
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
  assessmentInput: AssessmentMapLayer | WseAssessmentLine[] = [],
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
  const assessmentLayer = assessmentMapLayer(assessmentInput)
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
  if (settings.showAssessmentLines) {
    drawAssessmentLines(
      context,
      assessmentLayer.lines,
      view,
      settings.assessmentLineColor,
      settings.assessmentLineWidth,
    )
    drawAssessmentSelection(
      context,
      assessmentLayer.selectedLine,
      view,
      settings.assessmentLineWidth,
    )
  }
  if (settings.showOverlays) drawOverlays(context, overlays, view)
  context.restore()

  drawCenterlineStationing(
    context,
    assessmentLayer.centerlineStationing,
    view,
    settings,
    frame,
  )
  if (settings.showAssessmentLines) {
    drawAssessmentCallouts(
      context,
      assessmentLayer,
      view,
      settings,
      frame,
    )
    drawAssessmentReviewMarkers(context, assessmentLayer, view)
  }
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
