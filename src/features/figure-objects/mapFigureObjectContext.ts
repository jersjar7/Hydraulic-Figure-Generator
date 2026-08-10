import { makeMapView } from '../../core/map/view'
import { FRAMES } from '../../core/mapRenderer'
import type { Bounds, FigureSettings } from '../../core/types'
import { createMapCoordinateAdapter } from './figureObjectCoordinates'

export function createMapFigureObjectContext(
  bounds: Bounds,
  settings: FigureSettings,
) {
  const frame = FRAMES[settings.orientation]
  return {
    adapter: createMapCoordinateAdapter(
      makeMapView(bounds, frame, settings),
    ),
    frame,
    frameBounds: {
      left: 0,
      top: 0,
      right: frame.width,
      bottom: frame.height,
    },
  }
}
