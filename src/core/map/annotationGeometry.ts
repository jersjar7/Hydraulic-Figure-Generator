import type { MapAnnotation, MapCoordinate } from '../types'

export type AnnotationHitPart = 'body' | 'segment' | 'start' | 'end'

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

export function duplicateAnnotation(
  annotation: MapAnnotation,
  id: string,
  dx: number,
  dy: number,
): MapAnnotation {
  const { hydraulicExtremum: _hydraulicExtremum, ...copy } = annotation
  return {
    ...copy,
    id,
    rotation: annotation.rotation ?? 0,
    points: annotation.points.map((point) => ({
      x: point.x + dx,
      y: point.y + dy,
    })),
  }
}
