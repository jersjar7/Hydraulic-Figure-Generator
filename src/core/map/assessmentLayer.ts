import type {
  AssessmentMapLayer,
  Bounds,
  FigureSettings,
  MapCoordinate,
  WseAssessmentLine,
} from '../types'
import {
  FRAMES,
  makeMapView,
  type MapFrame,
  type MapView,
} from './view'

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

export type AssessmentCalloutHit = {
  lineId: string
  labelPoint: MapCoordinate
}

function layoutAssessmentCallouts(
  layer: AssessmentMapLayer,
  view: MapView,
  settings: FigureSettings,
  frame: MapFrame,
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
        const side = attempt % 2 === 0 ? preferredSide : -preferredSide
        const step = Math.floor(attempt / 2)
        const offset =
          (settings.assessmentLabelOffset + step * (height + 5)) * side
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
  const scale =
    1 /
    Math.max(
      Math.abs(dx) / Math.max(layout.width / 2, 1),
      Math.abs(dy) / Math.max(layout.height / 2, 1),
    )
  return {
    x: layout.labelX + dx * scale,
    y: layout.labelY + dy * scale,
  }
}

export function drawAssessmentLines(
  context: CanvasRenderingContext2D,
  lines: WseAssessmentLine[],
  view: MapView,
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

export function drawAssessmentSelection(
  context: CanvasRenderingContext2D,
  line: WseAssessmentLine | null | undefined,
  view: MapView,
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

export function drawAssessmentCallouts(
  context: CanvasRenderingContext2D,
  layer: AssessmentMapLayer,
  view: MapView,
  settings: FigureSettings,
  frame: MapFrame,
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

export function drawAssessmentReviewMarkers(
  context: CanvasRenderingContext2D,
  layer: AssessmentMapLayer,
  view: MapView,
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

export function hitTestAssessmentCallout(
  layer: AssessmentMapLayer,
  bounds: Bounds,
  settings: FigureSettings,
  x: number,
  y: number,
): AssessmentCalloutHit | null {
  if (!settings.showAssessmentLabels) return null
  const frame = FRAMES[settings.orientation]
  const view = makeMapView(bounds, frame, settings)
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

export function normalizeAssessmentMapLayer(
  input: AssessmentMapLayer | WseAssessmentLine[],
): AssessmentMapLayer {
  return Array.isArray(input) ? { lines: input } : input
}
