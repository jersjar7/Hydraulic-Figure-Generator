import { hitTestStationLabels } from '../../core/mapRenderer'
import type {
  Bounds,
  CenterlineStationLayer,
  FigureSettings,
  StationLabelOverride,
} from '../../core/types'
import type {
  MapInteractionTool,
  MapPointerInput,
} from '../map-interactions/mapInteraction'
import { stationLabelOverride } from '../../core/map/stationLabelLayout'
import { moveStationLabelOverrideInFrame } from './stationLabelFigureObject'

export type StationLabelInteractionToolOptions = {
  enabled: boolean
  layers?: readonly CenterlineStationLayer[]
  bounds: Bounds
  settings: FigureSettings
  selectLabel(id: string, centerlineId: string): void
  updateOverride(
    id: string,
    override: StationLabelOverride | null,
  ): void
  setDragging(dragging: boolean): void
}

export function createStationLabelInteractionTool({
  enabled,
  layers,
  bounds,
  settings,
  selectLabel,
  updateOverride,
  setDragging,
}: StationLabelInteractionToolOptions): MapInteractionTool {
  return {
    id: 'station-label',
    begin: ({ screenPoint }) => {
      if (!enabled) return null
      const hit = hitTestStationLabels(
        layers,
        bounds,
        settings,
        screenPoint.x,
        screenPoint.y,
      )
      if (!hit) return null

      const layer = layers?.find(
        (item) => item.centerline.id === hit.centerlineId,
      )
      const tick = layer?.ticks.find((item) => item.id === hit.id)
      const effectiveOverride = layer && tick
        ? stationLabelOverride(layer, settings, tick)
        : undefined
      const directOverride = settings.centerlineStationing.overrides[hit.id]
      const originalOverride = directOverride ?? effectiveOverride
      let moved = false
      const move = (input: MapPointerInput) => {
        const delta = {
          x: input.screenPoint.x - screenPoint.x,
          y: input.screenPoint.y - screenPoint.y,
        }
        if (!moved && Math.hypot(delta.x, delta.y) < 3) return
        moved = true
        updateOverride(
          hit.id,
          moveStationLabelOverrideInFrame({
            id: hit.id,
            geometry: hit,
            override: effectiveOverride,
            delta,
            settings,
          }),
        )
      }

      selectLabel(hit.id, hit.centerlineId)
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
