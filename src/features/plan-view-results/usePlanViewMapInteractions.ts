import {
  useCallback,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { canvasPointToMap } from '../../core/mapRenderer'
import type {
  Bounds,
  CenterlineStationLayer,
  FigureSettings,
  StationLabelOverride,
} from '../../core/types'
import { createManualAnnotationMapTool } from '../annotations/manualAnnotationMapTool'
import type { usePlanViewAnnotations } from './usePlanViewAnnotations'
import type { MapPointerInput } from '../map-interactions/mapInteraction'
import { useCanvasInteractionRuntime } from '../map-interactions/useCanvasInteractionRuntime'
import { createStationLabelInteractionTool } from '../stationing/stationLabelInteractionTool'

type Options = {
  enabled: boolean
  bounds: Bounds
  settings: FigureSettings
  annotations: ReturnType<typeof usePlanViewAnnotations>
  stationLayers: CenterlineStationLayer[]
  setActiveCenterline(id: string): void
  selectStationLabel(id: string | null): void
  updateStationOverride(id: string, override: StationLabelOverride | null): void
  openAnnotations(): void
  openStationing(): void
}

export function usePlanViewMapInteractions(options: Options) {
  const [stationLabelDragging, setStationLabelDragging] = useState(false)
  const pointerInput = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): MapPointerInput => {
      const canvas = event.currentTarget
      const rect = canvas.getBoundingClientRect()
      const screenPoint = {
        x: Math.max(0, Math.min(
          canvas.width,
          ((event.clientX - rect.left) * canvas.width) / rect.width,
        )),
        y: Math.max(0, Math.min(
          canvas.height,
          ((event.clientY - rect.top) * canvas.height) / rect.height,
        )),
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

  const runtime = useCanvasInteractionRuntime({
    enabled: options.enabled,
    pointerInput,
    tools: () => [
      createManualAnnotationMapTool({
        tool: options.annotations.tool,
        annotations: options.annotations.annotations,
        annotationStart: options.annotations.annotationStart,
        defaults: options.annotations.annotationDefaults,
        bounds: options.bounds,
        settings: options.settings,
        setAnnotations: options.annotations.setAnnotations,
        commitAnnotationChange:
          options.annotations.controller.commitAnnotationChange,
        setSelectedId: options.annotations.setSelectedId,
        setAnnotationStart: options.annotations.setAnnotationStart,
        showPlacedAnnotation: (annotation) => {
          options.annotations.controller.selectPlacedAnnotation(annotation)
          options.openAnnotations()
        },
        setDragging: options.annotations.setDragging,
        createAnnotation: options.annotations.controller.createAnnotation,
      }),
      createStationLabelInteractionTool({
        enabled: options.annotations.tool === 'select',
        layers: options.stationLayers,
        bounds: options.bounds,
        settings: options.settings,
        selectLabel: (id, centerlineId) => {
          options.setActiveCenterline(centerlineId)
          options.selectStationLabel(id)
          options.openStationing()
        },
        updateOverride: options.updateStationOverride,
        setDragging: setStationLabelDragging,
      }),
    ],
    onReset: () => {
      options.annotations.setDragging(false)
      setStationLabelDragging(false)
    },
  })

  return {
    ...runtime,
    stationLabelDragging,
    dragging: options.annotations.dragging || stationLabelDragging,
  }
}
