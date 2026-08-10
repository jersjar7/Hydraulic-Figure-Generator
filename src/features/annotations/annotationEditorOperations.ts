import {
  canvasPointToMap,
  duplicateAnnotation,
  FRAMES,
  moveAnnotationPoints,
  type AnnotationHitPart,
} from '../../core/mapRenderer'
import type {
  Bounds,
  FigureSettings,
  MapAnnotation,
  MapCoordinate,
} from '../../core/types'
import type { EditorCommand } from '../editor-history/editorCommand'
import { removeAdaptedFigureObject } from '../figure-objects/figureObjectAdapter'
import {
  removeAnnotation,
  translateAnnotation,
} from './annotationCollection'
import { annotationCapabilities } from './annotationCapabilities'
import { mapAnnotationFigureObjectAdapter } from './mapAnnotationFigureObject'
import {
  duplicateMapAnnotationFigureObject,
  isAnchoredMapCallout,
  nudgeMapAnnotationFigureObjectCommand,
} from './mapAnnotationManipulation'
import type { AnnotationEditorView } from './annotationEditorTypes'

export type AnnotationDrag = {
  id: string
  part: AnnotationHitPart
  start: MapCoordinate
  end: MapCoordinate
  originalPoints: MapCoordinate[]
}

export function annotationDisplayName(
  annotation: MapAnnotation,
  index: number,
) {
  if (annotation.hydraulicExtremum) {
    return annotation.hydraulicExtremum === 'max-rise'
      ? 'Max WSE rise'
      : 'Max WSE reduction'
  }
  return `${annotation.kind.charAt(0).toUpperCase()}${annotation.kind.slice(1)} ${index + 1}`
}

export function defaultAnnotationEditorView(
  annotation: MapAnnotation,
): AnnotationEditorView {
  return annotationCapabilities(annotation).content ? 'content' : 'style'
}

export function draggedAnnotationPoints(
  annotation: MapAnnotation,
  drag: AnnotationDrag,
) {
  return moveAnnotationPoints(
    annotation,
    drag.part,
    drag.originalPoints,
    drag.end.x - drag.start.x,
    drag.end.y - drag.start.y,
  )
}

export function removeSelectedAnnotation(
  annotations: MapAnnotation[],
  id: string,
  selected: MapAnnotation | null,
) {
  if (selected && (selected.kind === 'text' || isAnchoredMapCallout(selected))) {
    const removed = removeAdaptedFigureObject(
      annotations,
      id,
      mapAnnotationFigureObjectAdapter,
    )
    return { annotations: removed.items, selectedId: removed.selectedId }
  }
  return removeAnnotation(annotations, id)
}

export function duplicateSelectedAnnotation({
  selected,
  selectedIndex,
  id,
  bounds,
  settings,
}: {
  selected: MapAnnotation
  selectedIndex: number
  id: string
  bounds: Bounds
  settings: FigureSettings
}) {
  if (selected.kind === 'text' || isAnchoredMapCallout(selected)) {
    return duplicateMapAnnotationFigureObject({
      annotation: selected,
      index: selectedIndex,
      id,
      bounds,
      settings,
    })
  }
  const frame = FRAMES[settings.orientation]
  const origin = canvasPointToMap(
    frame.width / 2,
    frame.height / 2,
    bounds,
    settings,
  )
  const shifted = canvasPointToMap(
    frame.width / 2 + 18,
    frame.height / 2 + 18,
    bounds,
    settings,
  )
  return duplicateAnnotation(
    selected,
    id,
    shifted.x - origin.x,
    shifted.y - origin.y,
  )
}

export function nudgeSelectedAnnotationCommand({
  selected,
  dx,
  dy,
  bounds,
  settings,
}: {
  selected: MapAnnotation
  dx: number
  dy: number
  bounds: Bounds
  settings: FigureSettings
}): EditorCommand<MapAnnotation[]> | null {
  if (selected.kind === 'text' || isAnchoredMapCallout(selected)) {
    return selected.locked
      ? null
      : nudgeMapAnnotationFigureObjectCommand({
          id: selected.id,
          dx,
          dy,
          bounds,
          settings,
        })
  }
  const frame = FRAMES[settings.orientation]
  const center = canvasPointToMap(
    frame.width / 2,
    frame.height / 2,
    bounds,
    settings,
  )
  const offset = canvasPointToMap(
    frame.width / 2 + dx,
    frame.height / 2 + dy,
    bounds,
    settings,
  )
  return {
    label: 'nudge annotation',
    apply: (current) => current.map((annotation) =>
      annotation.id === selected.id
        ? translateAnnotation(
            annotation,
            offset.x - center.x,
            offset.y - center.y,
          )
        : annotation,
    ),
  }
}

export function reorderSelectedAnnotation(
  annotations: MapAnnotation[],
  id: string,
  direction: -1 | 1,
) {
  const currentIndex = annotations.findIndex((item) => item.id === id)
  const nextIndex = currentIndex + direction
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= annotations.length) {
    return annotations
  }
  const reordered = [...annotations]
  ;[reordered[currentIndex], reordered[nextIndex]] = [
    reordered[nextIndex],
    reordered[currentIndex],
  ]
  return reordered
}
