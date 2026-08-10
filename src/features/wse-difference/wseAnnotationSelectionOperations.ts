import type {
  HydraulicEngine,
  WseDifferenceExtrema,
} from '../../core/hydraulicEngine'
import {
  canvasPointToMap,
  duplicateAnnotation,
  formatHydraulicResultLabel,
  FRAMES,
  sampleHydraulicResult,
} from '../../core/mapRenderer'
import type {
  Bounds,
  FigureSettings,
  MapAnnotation,
  WseDifferenceScene,
} from '../../core/types'
import {
  removeAnnotation,
  translateAnnotation,
} from '../annotations/annotationCollection'
import { mapAnnotationFigureObjectAdapter } from '../annotations/mapAnnotationFigureObject'
import {
  duplicateMapAnnotationFigureObject,
  isAnchoredMapCallout,
  nudgeMapAnnotationFigureObjectCommand,
} from '../annotations/mapAnnotationManipulation'
import type { EditorCommand } from '../editor-history/editorCommand'
import { removeAdaptedFigureObject } from '../figure-objects/figureObjectAdapter'
import { defaultExtremumLabelPoint } from './workspaceInteractions'

export function removeSelectedWseAnnotation(
  annotations: MapAnnotation[],
  id: string,
  selected: MapAnnotation | null,
) {
  if (
    selected &&
    (selected.kind === 'text' || isAnchoredMapCallout(selected))
  ) {
    const removed = removeAdaptedFigureObject(
      annotations,
      id,
      mapAnnotationFigureObjectAdapter,
    )
    return {
      annotations: removed.items,
      selectedId: removed.selectedId,
    }
  }
  return removeAnnotation(annotations, id)
}

export function duplicateSelectedWseAnnotation({
  selected,
  selectedIndex,
  id,
  bounds,
  settings,
  scene,
  engine,
}: {
  selected: MapAnnotation
  selectedIndex: number
  id: string
  bounds: Bounds
  settings: FigureSettings
  scene: WseDifferenceScene | null
  engine: HydraulicEngine
}) {
  let copy: MapAnnotation
  if (selected.kind === 'text' || isAnchoredMapCallout(selected)) {
    copy = duplicateMapAnnotationFigureObject({
      annotation: selected,
      index: selectedIndex,
      id,
      bounds,
      settings,
    })
  } else {
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
    copy = duplicateAnnotation(
      selected,
      id,
      shifted.x - origin.x,
      shifted.y - origin.y,
    )
  }
  if (copy.kind !== 'result' || !copy.resultField || !scene) return copy
  const sample = sampleHydraulicResult(
    scene,
    engine.commonBounds(),
    settings,
    copy.points[0],
  )
  return sample
    ? {
        ...copy,
        text: formatHydraulicResultLabel(copy.resultField, sample),
      }
    : copy
}

export function nudgeSelectedWseAnnotationCommand({
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
    apply: (current) =>
      current.map((annotation) =>
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

export function defaultWseAnnotationPosition({
  selected,
  extrema,
  bounds,
  settings,
}: {
  selected: MapAnnotation
  extrema: WseDifferenceExtrema | null
  bounds: Bounds
  settings: FigureSettings
}) {
  if (!selected.hydraulicExtremum || !extrema) {
    return selected.defaultPoints
  }
  const extremum =
    selected.hydraulicExtremum === 'max-rise'
      ? extrema.rise
      : extrema.reduction
  return extremum
    ? [
        extremum.point,
        defaultExtremumLabelPoint(extremum, bounds, settings),
      ]
    : selected.defaultPoints
}
