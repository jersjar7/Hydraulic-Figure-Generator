import type {
  FigureCoordinateSpace,
  FigureObjectBounds,
  FigureObjectPoint,
} from '../../core/types'
import type { MapView } from '../../core/map/view'

export type FigureCoordinateAdapter = Readonly<{
  space: FigureCoordinateSpace
  toFrame(point: FigureObjectPoint): FigureObjectPoint
  fromFrame(point: FigureObjectPoint): FigureObjectPoint
}>

export const frameCoordinateAdapter: FigureCoordinateAdapter = {
  space: 'frame',
  toFrame: (point) => ({ ...point }),
  fromFrame: (point) => ({ ...point }),
}

export function defineFigureCoordinateAdapter(
  adapter: FigureCoordinateAdapter,
) {
  return adapter
}

export function createMapCoordinateAdapter(
  view: Pick<MapView, 'toScreen' | 'screenToMerc'>,
): FigureCoordinateAdapter {
  return defineFigureCoordinateAdapter({
    space: 'map',
    toFrame: (point) => {
      const [x, y] = view.toScreen(point.x, point.y)
      return { x, y }
    },
    fromFrame: (point) => view.screenToMerc(point.x, point.y),
  })
}

export function createPlotCoordinateAdapter({
  domain,
  frame,
}: {
  domain: FigureObjectBounds
  frame: FigureObjectBounds
}): FigureCoordinateAdapter {
  const domainWidth = domain.right - domain.left || 1
  const domainHeight = domain.bottom - domain.top || 1
  const frameWidth = frame.right - frame.left || 1
  const frameHeight = frame.bottom - frame.top || 1
  return defineFigureCoordinateAdapter({
    space: 'plot',
    toFrame: (point) => ({
      x: frame.left + ((point.x - domain.left) / domainWidth) * frameWidth,
      y: frame.bottom - ((point.y - domain.top) / domainHeight) * frameHeight,
    }),
    fromFrame: (point) => ({
      x: domain.left + ((point.x - frame.left) / frameWidth) * domainWidth,
      y: domain.top + ((frame.bottom - point.y) / frameHeight) * domainHeight,
    }),
  })
}

export function assertCoordinateSpace(
  expected: FigureCoordinateSpace,
  adapter: FigureCoordinateAdapter,
) {
  if (expected !== adapter.space) {
    throw new Error(
      `Figure object uses ${expected} coordinates, but the adapter uses ${adapter.space}.`,
    )
  }
}
