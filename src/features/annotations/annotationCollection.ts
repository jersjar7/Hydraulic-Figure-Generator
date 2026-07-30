import type {
  AnnotationDefaults,
  MapAnnotation,
} from '../../core/types'

export function updateAnnotation(
  annotations: MapAnnotation[],
  id: string,
  patch: Partial<AnnotationDefaults>,
) {
  return annotations.map((annotation) =>
    annotation.id === id ? { ...annotation, ...patch } : annotation,
  )
}

export function removeAnnotation(
  annotations: MapAnnotation[],
  id: string,
) {
  const index = annotations.findIndex((annotation) => annotation.id === id)
  const nextSelection =
    annotations[index + 1] ?? annotations[index - 1] ?? null
  return {
    annotations: annotations.filter((annotation) => annotation.id !== id),
    selectedId: nextSelection?.id ?? null,
  }
}

export function translateAnnotation(
  annotation: MapAnnotation,
  dx: number,
  dy: number,
) {
  return {
    ...annotation,
    points: annotation.points.map((point, index) =>
      annotation.hydraulicExtremum && index === 0
        ? point
        : { x: point.x + dx, y: point.y + dy },
    ),
  }
}
