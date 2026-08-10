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
    locked: annotation.locked ?? false,
    zIndex: index,
    points: annotation.points.map((point) => ({ ...point })),
    ...(annotation.kind === 'leader' || annotation.kind === 'result'
      ? {
          anchor: {
            pointIndex: 0,
            fixed: Boolean(annotation.hydraulicExtremum),
          },
          leader: {
            visible: annotation.leaderVisible ?? true,
            fromPointIndex: 0,
            toPointIndex: 1,
          },
        }
      : {}),
  }),
  fromFigureObject: (annotation, object) => {
    const callout =
      annotation.kind === 'leader' || annotation.kind === 'result'
    return {
      ...annotation,
      id: object.id,
      points: object.points.map((point) => ({ ...point })),
      ...(annotation.locked !== undefined || object.locked
        ? { locked: object.locked }
        : {}),
      ...(callout &&
      (annotation.leaderVisible !== undefined ||
        object.leader?.visible === false)
        ? { leaderVisible: object.leader?.visible ?? true }
        : {}),
    }
  },
}

export function mapAnnotationAsFigureObject(
  annotation: MapAnnotation,
  index = 0,
): FigureObject {
  return mapAnnotationFigureObjectAdapter.toFigureObject(annotation, index)
}
