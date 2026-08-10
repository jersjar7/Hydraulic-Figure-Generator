import {
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { canvasPointToMap } from '../../core/mapRenderer'
import type {
  Bounds,
  CenterlineStationLayer,
  FigureSettings,
  StationLabelOverride,
} from '../../core/types'
import type { MapPointerInput } from '../map-interactions/mapInteraction'
import { useCanvasInteractionRuntime } from '../map-interactions/useCanvasInteractionRuntime'
import { createStationLabelInteractionTool } from './stationLabelInteractionTool'

type Options = {
  enabled: boolean
  bounds: Bounds
  settings: FigureSettings
  layers?: readonly CenterlineStationLayer[]
  selectLabel(id: string, centerlineId: string): void
  updateOverride(id: string, override: StationLabelOverride | null): void
  setDragging(dragging: boolean): void
}

export function useStationLabelCanvasInteractions(options: Options) {
  const pointerInput = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): MapPointerInput => {
      const canvas = event.currentTarget
      const rect = canvas.getBoundingClientRect()
      const screenPoint = {
        x: Math.max(
          0,
          Math.min(
            canvas.width,
            ((event.clientX - rect.left) * canvas.width) / rect.width,
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            canvas.height,
            ((event.clientY - rect.top) * canvas.height) / rect.height,
          ),
        ),
      }
      return {
        screenPoint,
        mapPoint: canvasPointToMap(
          screenPoint.x,
          screenPoint.y,
          options.bounds,
          options.settings,
        ),
      }
    },
    [options.bounds, options.settings],
  )

  return useCanvasInteractionRuntime({
    enabled: options.enabled,
    tools: () => [createStationLabelInteractionTool(options)],
    pointerInput,
    onReset: () => options.setDragging(false),
  })
}
