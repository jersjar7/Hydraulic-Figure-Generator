import type {
  FigureObject,
  MapAnnotation,
} from '../../core/types'
import type { FigureObjectAdapter } from '../figure-objects/figureObjectAdapter'

export const mapAnnotationFigureObjectAdapter: FigureObjectAdapter<MapAnnotation> = {
  toFigureObject: (annotation, index) => ({
    id: annotation.id,
    kind: `annotation:${annotation.kind}`,
    coordinateSpace: 'map',
    visible: true,
    locked: false,
    zIndex: index,
    points: annotation.points.map((point) => ({ ...point })),
    ...(annotation.kind === 'leader' || annotation.kind === 'result'
      ? {
          anchor: {
            pointIndex: 0,
            fixed: Boolean(annotation.hydraulicExtremum),
          },
          leader: {
            visible: true,
            fromPointIndex: 0,
            toPointIndex: 1,
          },
        }
      : {}),
  }),
  fromFigureObject: (annotation, object) => ({
    ...annotation,
    id: object.id,
    points: object.points.map((point) => ({ ...point })),
  }),
}

export function mapAnnotationAsFigureObject(
  annotation: MapAnnotation,
  index = 0,
): FigureObject {
  return mapAnnotationFigureObjectAdapter.toFigureObject(annotation, index)
}
