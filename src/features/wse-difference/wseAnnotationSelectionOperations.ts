import type {
  HydraulicEngine,
  WseDifferenceExtrema,
} from '../../core/hydraulicEngine'
import {
  formatHydraulicResultLabel,
  sampleHydraulicResult,
} from '../../core/mapRenderer'
import type {
  Bounds,
  FigureSettings,
  MapAnnotation,
  WseDifferenceScene,
} from '../../core/types'
import {
  duplicateSelectedAnnotation,
  nudgeSelectedAnnotationCommand,
  removeSelectedAnnotation,
} from '../annotations/annotationEditorOperations'
import type { EditorCommand } from '../editor-history/editorCommand'
import { defaultExtremumLabelPoint } from './workspaceInteractions'

export function removeSelectedWseAnnotation(
  annotations: MapAnnotation[],
  id: string,
  selected: MapAnnotation | null,
) {
  return removeSelectedAnnotation(annotations, id, selected)
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
  const copy = duplicateSelectedAnnotation({
    selected,
    selectedIndex,
    id,
    bounds,
    settings,
  })
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
  return nudgeSelectedAnnotationCommand({
    selected,
    dx,
    dy,
    bounds,
    settings,
  })
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
