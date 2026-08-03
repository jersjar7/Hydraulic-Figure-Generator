import type {
  Bounds,
  CrossSectionLine,
  FigureSettings,
  MapCoordinate,
} from '../../core/types'
import {
  FRAMES,
  makeMapView,
} from '../../core/map/view'
import type { CrossSectionFigureSettings } from './crossSectionSettings'

type ScreenPoint = {
  x: number
  y: number
}

function directedPoints(line: CrossSectionLine) {
  return line.direction === 'b-to-a'
    ? [...line.points].reverse()
    : line.points
}

function pathLocation(
  points: ScreenPoint[],
  fraction: number,
) {
  const lengths: number[] = []
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const length = Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    )
    lengths.push(length)
    total += length
  }
  const target = total * fraction
  let accumulated = 0
  for (let index = 1; index < points.length; index += 1) {
    const length = lengths[index - 1]
    if (accumulated + length >= target || index === points.length - 1) {
      const local = length > 0 ? (target - accumulated) / length : 0
      const dx = points[index].x - points[index - 1].x
      const dy = points[index].y - points[index - 1].y
      const tangentLength = Math.hypot(dx, dy) || 1
      return {
        point: {
          x: points[index - 1].x + dx * Math.max(0, Math.min(1, local)),
          y: points[index - 1].y + dy * Math.max(0, Math.min(1, local)),
        },
        tangent: {
          x: dx / tangentLength,
          y: dy / tangentLength,
        },
      }
    }
    accumulated += length
  }
  return {
    point: points[0],
    tangent: { x: 1, y: 0 },
  }
}

function arrowHead(
  context: CanvasRenderingContext2D,
  point: ScreenPoint,
  tangent: ScreenPoint,
  size: number,
) {
  const normal = { x: -tangent.y, y: tangent.x }
  context.beginPath()
  context.moveTo(point.x, point.y)
  context.lineTo(
    point.x - tangent.x * size + normal.x * size * 0.55,
    point.y - tangent.y * size + normal.y * size * 0.55,
  )
  context.lineTo(
    point.x - tangent.x * size - normal.x * size * 0.55,
    point.y - tangent.y * size - normal.y * size * 0.55,
  )
  context.closePath()
  context.fill()
}

function endpointMarker(
  context: CanvasRenderingContext2D,
  point: ScreenPoint,
  label: string,
) {
  context.fillStyle = '#ffffff'
  context.strokeStyle = '#075f96'
  context.lineWidth = 2
  context.beginPath()
  context.arc(point.x, point.y, 10, 0, Math.PI * 2)
  context.fill()
  context.stroke()
  context.fillStyle = '#06466c'
  context.font = '700 12px Arial, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(label, point.x, point.y + 0.5)
}

function viewDirection(
  location: ReturnType<typeof pathLocation>,
  settings: CrossSectionFigureSettings,
) {
  const sideSign = settings.downstreamSide === 'right' ? 1 : -1
  const directionSign =
    settings.lookingDirection === 'downstream' ? sideSign : -sideSign
  return {
    x: -location.tangent.y * directionSign,
    y: location.tangent.x * directionSign,
  }
}

function endpointChevron(
  context: CanvasRenderingContext2D,
  location: ReturnType<typeof pathLocation>,
  settings: CrossSectionFigureSettings,
) {
  const direction = viewDirection(location, settings)
  const cross = { x: -direction.y, y: direction.x }
  const tip = {
    x: location.point.x + direction.x * 25,
    y: location.point.y + direction.y * 25,
  }
  const back = {
    x: location.point.x + direction.x * 15,
    y: location.point.y + direction.y * 15,
  }

  const draw = () => {
    context.beginPath()
    context.moveTo(back.x + cross.x * 5, back.y + cross.y * 5)
    context.lineTo(tip.x, tip.y)
    context.lineTo(back.x - cross.x * 5, back.y - cross.y * 5)
    context.stroke()
  }

  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = 'rgba(255, 255, 255, 0.95)'
  context.lineWidth = 5
  draw()
  context.strokeStyle = '#9f1d1d'
  context.lineWidth = 2.5
  draw()
  context.restore()
}

function viewArrow(
  context: CanvasRenderingContext2D,
  midpoint: ReturnType<typeof pathLocation>,
  settings: CrossSectionFigureSettings,
) {
  const normal = viewDirection(midpoint, settings)
  const start = {
    x: midpoint.point.x + normal.x * 6,
    y: midpoint.point.y + normal.y * 6,
  }
  const end = {
    x: midpoint.point.x + normal.x * 60,
    y: midpoint.point.y + normal.y * 60,
  }
  context.save()
  context.strokeStyle = '#9f1d1d'
  context.fillStyle = '#9f1d1d'
  context.lineWidth = 3
  context.beginPath()
  context.moveTo(start.x, start.y)
  context.lineTo(end.x, end.y)
  context.stroke()
  arrowHead(context, end, normal, 10)

  const label =
    settings.lookingDirection === 'downstream' ? 'LOOK DS' : 'LOOK US'
  context.font = '700 11px Arial, sans-serif'
  const width = context.measureText(label).width + 12
  const labelX = end.x + normal.x * 9
  const labelY = end.y + normal.y * 9
  context.fillStyle = 'rgba(255, 255, 255, 0.94)'
  context.strokeStyle = '#a7b3bf'
  context.lineWidth = 1
  context.beginPath()
  context.roundRect(
    labelX - width / 2,
    labelY - 10,
    width,
    20,
    4,
  )
  context.fill()
  context.stroke()
  context.fillStyle = '#8d1717'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(label, labelX, labelY + 0.5)
  context.restore()
}

export function drawCrossSectionSelectionOverlay(
  context: CanvasRenderingContext2D,
  line: CrossSectionLine | null,
  bounds: Bounds,
  mapSettings: FigureSettings,
  crossSectionSettings: CrossSectionFigureSettings,
) {
  if (!line || line.points.length < 2) return
  const frame = FRAMES[mapSettings.orientation]
  const view = makeMapView(bounds, frame, mapSettings)
  const screenPoints = directedPoints(line).map((point: MapCoordinate) => {
    const [x, y] = view.toScreen(point.x, point.y)
    return { x, y }
  })

  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.beginPath()
  screenPoints.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y)
    else context.lineTo(point.x, point.y)
  })
  context.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  context.lineWidth = 4
  context.stroke()
  context.strokeStyle = '#0877b9'
  context.lineWidth = 2
  context.stroke()

  endpointMarker(context, screenPoints[0], 'A')
  endpointMarker(context, screenPoints.at(-1)!, 'B')
  endpointChevron(
    context,
    pathLocation(screenPoints, 0),
    crossSectionSettings,
  )
  endpointChevron(
    context,
    pathLocation(screenPoints, 1),
    crossSectionSettings,
  )
  viewArrow(
    context,
    pathLocation(screenPoints, 0.5),
    crossSectionSettings,
  )
  context.restore()
}
