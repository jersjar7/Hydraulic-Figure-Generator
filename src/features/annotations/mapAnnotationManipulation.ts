import type {
  Bounds,
  FigureSettings,
  MapAnnotation,
} from '../../core/types'
import { updateFigureObjectCommand } from '../figure-objects/figureObjectCommands'
import {
  duplicateFigureObject,
  moveFigureObjectInFrame,
} from '../figure-objects/figureObjectGeometry'
import { createMapFigureObjectContext } from '../figure-objects/mapFigureObjectContext'
import { mapAnnotationFigureObjectAdapter } from './mapAnnotationFigureObject'

const FRAME_PADDING = 20

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
  return mapAnnotationFigureObjectAdapter.fromFigureObject(
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
    label: 'nudge text annotation',
    mergeKey: `nudge:${id}`,
    adapter: mapAnnotationFigureObjectAdapter,
    update: (object) =>
      moveFigureObjectInFrame(
        object,
        { type: 'body' },
        { x: dx, y: dy },
        context.adapter,
        context.frameBounds,
        FRAME_PADDING,
      ),
  })
}
