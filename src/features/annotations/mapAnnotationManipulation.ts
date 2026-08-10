import type {
  Bounds,
  FigureObjectDragTarget,
  FigureSettings,
  MapAnnotation,
  MapCoordinate,
} from '../../core/types'
import { updateFigureObjectCommand } from '../figure-objects/figureObjectCommands'
import {
  duplicateFigureObject,
  moveFigureObjectInFrame,
} from '../figure-objects/figureObjectGeometry'
import { createMapFigureObjectContext } from '../figure-objects/mapFigureObjectContext'
import { mapAnnotationFigureObjectAdapter } from './mapAnnotationFigureObject'

const FRAME_PADDING = 20

function samePoints(
  left: readonly MapCoordinate[],
  right: readonly MapCoordinate[],
) {
  return (
    left.length === right.length &&
    left.every(
      (point, index) =>
        point.x === right[index]?.x && point.y === right[index]?.y,
    )
  )
}

export function isAnchoredMapCallout(annotation: MapAnnotation) {
  return annotation.kind === 'leader' || annotation.kind === 'result'
}

export function mapAnnotationDragTarget(
  annotation: MapAnnotation,
  part: 'body' | 'segment' | 'start' | 'end',
): FigureObjectDragTarget {
  if (!isAnchoredMapCallout(annotation)) return { type: 'body' }
  if (part === 'start') return { type: 'point', pointIndex: 0 }
  if (part === 'end' || part === 'body') {
    return { type: 'point', pointIndex: 1 }
  }
  return { type: 'body' }
}

export function duplicateMapAnnotationFigureObject({
  annotation,
  index,
  id,
  bounds,
  settings,
  offset = { x: 18, y: 18 },
}: {
  annotation: MapAnnotation
  index: number
  id: string
  bounds: Bounds
  settings: FigureSettings
  offset?: { x: number; y: number }
}) {
  const context = createMapFigureObjectContext(bounds, settings)
  const duplicated = mapAnnotationFigureObjectAdapter.fromFigureObject(
    annotation,
    duplicateFigureObject(
      mapAnnotationFigureObjectAdapter.toFigureObject(annotation, index),
      id,
      offset,
      context.adapter,
      context.frameBounds,
      FRAME_PADDING,
    ),
  )
  const { hydraulicExtremum: _hydraulicExtremum, ...copy } = duplicated
  return {
    ...copy,
    locked: false,
    defaultPoints: copy.points.map((point) => ({ ...point })),
  }
}

export function nudgeMapAnnotationFigureObjectCommand({
  id,
  dx,
  dy,
  bounds,
  settings,
}: {
  id: string
  dx: number
  dy: number
  bounds: Bounds
  settings: FigureSettings
}) {
  const context = createMapFigureObjectContext(bounds, settings)
  return updateFigureObjectCommand<MapAnnotation>({
    id,
    label: 'nudge annotation',
    mergeKey: `nudge:${id}`,
    adapter: mapAnnotationFigureObjectAdapter,
    update: (object) =>
      moveFigureObjectInFrame(
        object,
        object.kind === 'annotation:leader' ||
          object.kind === 'annotation:result'
          ? { type: 'point', pointIndex: 1 }
          : { type: 'body' },
        { x: dx, y: dy },
        context.adapter,
        context.frameBounds,
        FRAME_PADDING,
      ),
  })
}

export function setMapAnnotationLockedCommand({
  id,
  locked,
}: {
  id: string
  locked: boolean
}) {
  return updateFigureObjectCommand<MapAnnotation>({
    id,
    label: locked ? 'lock annotation position' : 'unlock annotation position',
    adapter: mapAnnotationFigureObjectAdapter,
    update: (object) =>
      object.locked === locked ? object : { ...object, locked },
  })
}

export function setMapCalloutLeaderVisibleCommand({
  id,
  visible,
}: {
  id: string
  visible: boolean
}) {
  return updateFigureObjectCommand<MapAnnotation>({
    id,
    label: visible ? 'show callout leader' : 'hide callout leader',
    adapter: mapAnnotationFigureObjectAdapter,
    update: (object) =>
      !object.leader || object.leader.visible === visible
        ? object
        : {
            ...object,
            leader: { ...object.leader, visible },
          },
  })
}

export function resetMapAnnotationPositionCommand({
  id,
  points,
}: {
  id: string
  points: readonly MapCoordinate[]
}) {
  return updateFigureObjectCommand<MapAnnotation>({
    id,
    label: 'reset annotation position',
    adapter: mapAnnotationFigureObjectAdapter,
    update: (object) =>
      object.locked || samePoints(object.points, points)
        ? object
        : {
            ...object,
            points: points.map((point) => ({ ...point })),
          },
  })
}
