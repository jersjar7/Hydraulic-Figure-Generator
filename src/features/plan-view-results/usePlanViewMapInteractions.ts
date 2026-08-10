import {
  useCallback,
  useState,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { canvasPointToMap } from '../../core/mapRenderer'
import type {
  Bounds,
  CenterlineStationLayer,
  MapElementBounds,
  MapElementKey,
  PlanViewResultSettings,
  StationLabelOverride,
} from '../../core/types'
import { createManualAnnotationMapTool } from '../annotations/manualAnnotationMapTool'
import type { usePlanViewAnnotations } from './usePlanViewAnnotations'
import type { MapPointerInput } from '../map-interactions/mapInteraction'
import { useCanvasInteractionRuntime } from '../map-interactions/useCanvasInteractionRuntime'
import { createStationLabelInteractionTool } from '../stationing/stationLabelInteractionTool'
import { createFigureElementInteractionTool } from '../figure-elements/figureElementInteractionTool'
import type { useMapElementController } from '../figures/useMapElementController'

type Options = {
  enabled: boolean
  bounds: Bounds
  settings: PlanViewResultSettings
  activeSection: string
  elementBoundsRef: RefObject<MapElementBounds[]>
  elements: ReturnType<typeof useMapElementController<PlanViewResultSettings>>
  annotations: ReturnType<typeof usePlanViewAnnotations>
  stationLayers: CenterlineStationLayer[]
  setActiveCenterline(id: string): void
  selectStationLabel(id: string | null): void
  updateStationOverride(id: string, override: StationLabelOverride | null): void
  selectElement(key: MapElementKey): void
  openElements(): void
  openAnnotations(): void
  openStationing(): void
}

export function usePlanViewMapInteractions(options: Options) {
  const [stationLabelDragging, setStationLabelDragging] = useState(false)
  const [elementDragging, setElementDragging] = useState(false)
  const [hoveredElement, setHoveredElement] = useState<MapElementKey | null>(null)
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
      createFigureElementInteractionTool({
        enabled: options.activeSection === 'elements',
        settings: options.settings,
        elementBounds: () => options.elementBoundsRef.current,
        selectElement: (key) => {
          options.selectElement(key)
          options.openElements()
        },
        previewPosition: options.elements.previewElementPosition,
        commitPosition: options.elements.commitElementPosition,
        setDragging: setElementDragging,
        setHovered: setHoveredElement,
      }),
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
      setElementDragging(false)
      setHoveredElement(null)
    },
  })

  return {
    ...runtime,
    stationLabelDragging,
    elementDragging,
    hoveredElement,
    handlePointerLeave: () => {
      if (!elementDragging) setHoveredElement(null)
    },
    dragging:
      options.annotations.dragging || stationLabelDragging || elementDragging,
  }
}
