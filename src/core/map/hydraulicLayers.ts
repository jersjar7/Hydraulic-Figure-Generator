import type { FigureSettings, ProjectedGeometry } from '../types'
import type { MapView } from './view'

const VALID = (value: number) =>
  value != null && Number.isFinite(value) && value > -900

export function localCoordinates(
  projected: ProjectedGeometry,
  view: MapView,
) {
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

export function differenceColor(value: number, maxAbsolute: number) {
  if (!VALID(value)) return null
  const color = interpolateColor(
    (value + maxAbsolute) / (2 * maxAbsolute || 1),
  )
  return `rgb(${color.join(',')})`
}

export function differenceBandCount(
  maxAbsolute: number,
  interval: number | null,
) {
  return interval && interval > 0
    ? Math.max(1, Math.min(80, Math.round((2 * maxAbsolute) / interval)))
    : 8
}

export function differenceBreaks(
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

export function fillDifferenceBands(
  context: CanvasRenderingContext2D,
  localX: Float64Array,
  localY: Float64Array,
  triangles: Uint32Array,
  values: Float32Array,
  maxAbsolute: number,
  interval: number | null,
) {
  const bandCount = differenceBandCount(maxAbsolute, interval)
  fillScalarBands(
    context,
    localX,
    localY,
    triangles,
    values,
    -maxAbsolute,
    maxAbsolute,
    bandCount,
    (value) => differenceColor(value, maxAbsolute) ?? '#ffffff',
  )
}

export function fillScalarBands(
  context: CanvasRenderingContext2D,
  localX: Float64Array,
  localY: Float64Array,
  triangles: Uint32Array,
  values: Float32Array,
  minimum: number,
  maximum: number,
  bandCount: number,
  color: (value: number) => string,
) {
  const safeBandCount = Math.max(1, Math.min(160, bandCount))
  const step = (maximum - minimum) / safeBandCount
  if (!Number.isFinite(step) || step <= 0) return

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

    for (let band = 0; band < safeBandCount; band += 1) {
      const lower =
        band === 0 ? Number.NEGATIVE_INFINITY : minimum + band * step
      const upper =
        band === safeBandCount - 1
          ? Number.POSITIVE_INFINITY
          : minimum + (band + 1) * step
      let polygon = clipScalarPolygon(source, lower, true)
      polygon = clipScalarPolygon(polygon, upper, false)
      if (polygon.length < 3) continue
      const middle = minimum + (band + 0.5) * step
      context.fillStyle = color(middle)
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

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return hex
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

export function fillWetDry(
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

export function drawContourLevels(
  context: CanvasRenderingContext2D,
  localX: Float64Array,
  localY: Float64Array,
  triangles: Uint32Array,
  values: Float32Array,
  levels: number[],
  color: string,
  width = 1.5,
) {
  if (levels.length === 0) return
  context.save()
  context.strokeStyle = color
  context.lineWidth = width
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

export function drawValidBoundary(
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
