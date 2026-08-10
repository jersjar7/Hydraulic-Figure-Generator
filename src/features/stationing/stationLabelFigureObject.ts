import { FRAMES } from '../../core/mapRenderer'
import type {
  FigureObject,
  FigureSettings,
  MapCoordinate,
  StationLabelOverride,
} from '../../core/types'
import { frameCoordinateAdapter } from '../figure-objects/figureObjectCoordinates'
import { moveFigureObjectInFrame } from '../figure-objects/figureObjectGeometry'

const FRAME_PADDING = 20

export type StationLabelFrameGeometry = {
  targetScreenPoint: MapCoordinate
  labelScreenPoint: MapCoordinate
}

function asFigureObject(
  id: string,
  geometry: StationLabelFrameGeometry,
  override: StationLabelOverride | undefined,
): FigureObject<'station-label'> {
  return {
    id,
    kind: 'station-label',
    coordinateSpace: 'frame',
    visible: override?.visible !== false,
    locked: false,
    zIndex: 0,
    points: [geometry.targetScreenPoint, geometry.labelScreenPoint],
    anchor: { pointIndex: 0, fixed: true },
    leader: {
      visible: override?.leaderVisible ?? true,
      fromPointIndex: 0,
      toPointIndex: 1,
    },
  }
}

export function moveStationLabelOverrideInFrame({
  id,
  geometry,
  override,
  delta,
  settings,
}: {
  id: string
  geometry: StationLabelFrameGeometry
  override: StationLabelOverride | undefined
  delta: MapCoordinate
  settings: FigureSettings
}) {
  const frame = FRAMES[settings.orientation]
  const moved = moveFigureObjectInFrame(
    asFigureObject(id, geometry, override),
    { type: 'point', pointIndex: 1 },
    delta,
    frameCoordinateAdapter,
    { left: 0, top: 0, right: frame.width, bottom: frame.height },
    FRAME_PADDING,
  )
  const label = moved.points[1]
  if (!label) return override ?? {}
  const { labelPoint: _legacyLabelPoint, ...rest } = override ?? {}
  return {
    ...rest,
    framePoint: {
      x: label.x / frame.width,
      y: label.y / frame.height,
    },
  }
}

export function resetStationLabelPosition(
  override: StationLabelOverride | undefined,
) {
  if (!override) return null
  const {
    framePoint: _framePoint,
    labelPoint: _labelPoint,
    ...rest
  } = override
  return Object.keys(rest).length > 0 ? rest : null
}
