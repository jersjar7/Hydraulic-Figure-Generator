import { hitTestStationLabel } from '../../../core/mapRenderer'
import type {
  Bounds,
  CenterlineStationLayer,
  FigureSettings,
  StationLabelOverride,
} from '../../../core/types'
import type {
  MapInteractionTool,
  MapPointerInput,
} from '../../map-interactions/mapInteraction'

type StationLabelToolOptions = {
  enabled: boolean
  layer?: CenterlineStationLayer
  bounds: Bounds
  settings: FigureSettings
  selectLabel(id: string): void
  updateOverride(
    id: string,
    override: Partial<StationLabelOverride> | null,
  ): void
  setDragging(dragging: boolean): void
}

export function createStationLabelTool({
  enabled,
  layer,
  bounds,
  settings,
  selectLabel,
  updateOverride,
  setDragging,
}: StationLabelToolOptions): MapInteractionTool {
  return {
    id: 'station-label',
    begin: ({ screenPoint, mapPoint }) => {
      if (!enabled) return null
      const hit = hitTestStationLabel(
        layer,
        bounds,
        settings,
        screenPoint.x,
        screenPoint.y,
      )
      if (!hit) return null

      const originalOverride =
        settings.centerlineStationing.overrides[hit.id]
      let moved = false
      const move = (input: MapPointerInput) => {
        if (
          !moved &&
          Math.hypot(
            input.screenPoint.x - screenPoint.x,
            input.screenPoint.y - screenPoint.y,
          ) < 3
        ) {
          return
        }
        moved = true
        updateOverride(hit.id, {
          ...originalOverride,
          labelPoint: {
            x: hit.labelPoint.x + input.mapPoint.x - mapPoint.x,
            y: hit.labelPoint.y + input.mapPoint.y - mapPoint.y,
          },
        })
      }

      selectLabel(hit.id)
      setDragging(true)
      return {
        handled: true,
        capturePointer: true,
        session: {
          id: `station-label:${hit.id}`,
          move,
          finish: (input) => {
            move(input)
            setDragging(false)
          },
          cancel: () => {
            updateOverride(hit.id, originalOverride ?? null)
            setDragging(false)
          },
        },
      }
    },
  }
}
