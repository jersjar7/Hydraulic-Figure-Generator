import type {
  HydraulicEngine,
  WseDifferenceExtremum,
} from '../../core/hydraulicEngine'
import {
  canvasPointToMap,
  formatHydraulicResultLabel,
  FRAMES,
  mapPointToCanvas,
  moveAnnotationPoints,
  sampleHydraulicResult,
  type AnnotationHitPart,
} from '../../core/mapRenderer'
import type {
  Bounds,
  FigureSettings,
  MapAnnotation,
  MapCoordinate,
  MapElementBounds,
  MapElementKey,
  StationLabelOverride,
  WseAssessmentLine,
  WseExtremumKind,
  WseDifferenceScene,
} from '../../core/types'
import type { AnnotationEditorView } from './workspaceConfiguration'

export type AnnotationDrag = {
  id: string
  part: AnnotationHitPart
  start: MapCoordinate
  end: MapCoordinate
  originalPoints: MapCoordinate[]
}

export type FigureElementDrag = {
  key: MapElementKey
  start: { x: number; y: number }
  originalPosition: FigureSettings['elementPositions'][MapElementKey]
  originalBounds: MapElementBounds
}

export type AssessmentCalloutDrag = {
  lineId: string
  startScreen: { x: number; y: number }
  startPointer: MapCoordinate
  originalRenderedPoint: MapCoordinate
  originalOverridePoint?: MapCoordinate
  moved: boolean
}

export type StationLabelDrag = {
  id: string
  startScreen: { x: number; y: number }
  startPointer: MapCoordinate
  originalRenderedPoint: MapCoordinate
  originalOverride: StationLabelOverride | undefined
  moved: boolean
}

export function assessmentWseLabel(level: number) {
  return `WSE ${level.toFixed(1)} ft`
}

export function draggedAnnotationPoints(
  annotation: MapAnnotation,
  drag: AnnotationDrag,
) {
  const dx = drag.end.x - drag.start.x
  const dy = drag.end.y - drag.start.y
  return moveAnnotationPoints(
    annotation,
    drag.part,
    drag.originalPoints,
    dx,
    dy,
  )
}

export function updateDraggedResultAnnotation(
  annotation: MapAnnotation,
  dragPart: AnnotationHitPart,
  scene: WseDifferenceScene | null,
  engine: HydraulicEngine,
  settings: FigureSettings,
) {
  if (
    annotation.kind !== 'result' ||
    !annotation.resultField ||
    !scene ||
    (dragPart !== 'start' && dragPart !== 'segment')
  ) {
    return annotation
  }
  const sample = sampleHydraulicResult(
    scene,
    engine.commonBounds(),
    settings,
    annotation.points[0],
  )
  return sample
    ? {
        ...annotation,
        text: formatHydraulicResultLabel(annotation.resultField, sample),
      }
    : annotation
}

export function defaultExtremumLabelPoint(
  extremum: WseDifferenceExtremum,
  bounds: Bounds,
  settings: FigureSettings,
) {
  const frame = FRAMES[settings.orientation]
  const target = mapPointToCanvas(extremum.point, bounds, settings)
  const horizontalOffset = target.x < frame.width / 2 ? 190 : -190
  const verticalOffset = extremum.kind === 'max-rise' ? -90 : 90
  const label = {
    x: Math.max(
      190,
      Math.min(frame.width - 190, target.x + horizontalOffset),
    ),
    y: Math.max(
      65,
      Math.min(frame.height - 65, target.y + verticalOffset),
    ),
  }
  return canvasPointToMap(label.x, label.y, bounds, settings)
}

function extremumDisplayName(kind: WseExtremumKind) {
  return kind === 'max-rise' ? 'Max WSE rise' : 'Max WSE reduction'
}

export function annotationDisplayName(
  annotation: MapAnnotation,
  index: number,
) {
  return annotation.hydraulicExtremum
    ? extremumDisplayName(annotation.hydraulicExtremum)
    : `${annotation.kind.charAt(0).toUpperCase()}${annotation.kind.slice(1)} ${index + 1}`
}

export function annotationHasContentEditor(annotation: MapAnnotation) {
  return annotation.kind !== 'line' && annotation.kind !== 'arrow'
}

export function defaultEditorView(
  annotation: MapAnnotation,
): AnnotationEditorView {
  return annotationHasContentEditor(annotation) ? 'content' : 'style'
}

function pointSegmentDistance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }
  const fraction = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        lengthSquared,
    ),
  )
  return Math.hypot(
    point.x - (start.x + dx * fraction),
    point.y - (start.y + dy * fraction),
  )
}

export function assessmentLineAt(
  lines: WseAssessmentLine[],
  bounds: Bounds,
  settings: FigureSettings,
  point: { x: number; y: number },
) {
  let closest: { line: WseAssessmentLine; distance: number } | null = null
  for (const line of lines) {
    for (let index = 1; index < line.points.length; index += 1) {
      const start = mapPointToCanvas(
        line.points[index - 1],
        bounds,
        settings,
      )
      const end = mapPointToCanvas(line.points[index], bounds, settings)
      const distance = pointSegmentDistance(point, start, end)
      if (distance <= 10 && (!closest || distance < closest.distance)) {
        closest = { line, distance }
      }
    }
  }
  return closest?.line ?? null
}
