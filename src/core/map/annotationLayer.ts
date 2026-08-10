import type {
  Bounds,
  FigureSettings,
  MapAnnotation,
  MapCoordinate,
} from '../types'
import type { AnnotationHitPart } from './annotationGeometry'
import { roundedRectangle } from './drawingPrimitives'
import { hexToRgba } from './hydraulicLayers'
import {
  FRAMES,
  makeMapView as makeView,
  type MapView as View,
} from './view'
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

export function drawAnnotations(
  context: CanvasRenderingContext2D,
  annotations: MapAnnotation[],
  view: View,
) {
  for (const annotation of annotations) {
    if (annotation.visible === false) continue
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
      if (annotation.leaderVisible !== false) {
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
      }
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

export function drawAnnotationSelection(
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
    if (
      annotation.leaderVisible !== false &&
      !annotation.hydraulicExtremum &&
      !annotation.locked
    ) {
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
    if (annotation.visible === false) continue
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
      if (
        annotation.leaderVisible !== false &&
        Math.hypot(x - points[0].x, y - points[0].y) <= 16
      ) {
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
      ((annotation.kind !== 'leader' && annotation.kind !== 'result') ||
        annotation.leaderVisible !== false) &&
      pointToSegmentDistance(pointer, points[0], points[1]) <=
        Math.max(10, annotation.lineWidth + 6)
    ) {
      return { id: annotation.id, part: 'segment' }
    }
  }
  return null
}
