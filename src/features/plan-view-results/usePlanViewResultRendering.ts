import { useEffect, useRef, type RefObject } from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  IngestNotice,
  CenterlineStationLayer,
  MapAnnotation,
  MapElementBounds,
  MapElementKey,
  MapOverlay,
  PlanViewResultScene,
  PlanViewResultSettings,
} from '../../core/types'
import { planViewResultFigure } from './planViewResultFigure'
import { createPlanViewResultRenderDocument } from './planViewResultRenderDocument'

type Options = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  scene: PlanViewResultScene | null
  engine: HydraulicEngine
  settings: PlanViewResultSettings
  overlays: MapOverlay[]
  centerlineStationing?: CenterlineStationLayer[]
  annotations?: MapAnnotation[]
  selectedAnnotationId?: string | null
  selectedElementKey?: MapElementKey | null
  elementBoundsRef: RefObject<MapElementBounds[]>
  enabled?: boolean
  setBusy(busy: boolean): void
  appendNotices(notices: IngestNotice[]): void
  interacting?: boolean
}

export function usePlanViewResultRendering({
  canvasRef,
  scene,
  engine,
  settings,
  overlays,
  centerlineStationing,
  annotations,
  selectedAnnotationId,
  selectedElementKey,
  elementBoundsRef,
  enabled = true,
  setBusy,
  appendNotices,
  interacting = false,
}: Options) {
  const renderSequence = useRef(0)

  useEffect(() => {
    if (!enabled || !scene || !canvasRef.current) return
    const sequence = ++renderSequence.current
    const output = document.createElement('canvas')
    const controller = new AbortController()
    if (!interacting) setBusy(true)
    void planViewResultFigure
      .render({
        canvas: output,
        document: createPlanViewResultRenderDocument({
          engine,
          scene,
          settings,
          overlays,
          centerlineStationing,
          annotations,
          selectedAnnotationId,
          selectedElementKey,
        }),
        signal: controller.signal,
      })
      .then((elementBounds) => {
        if (renderSequence.current !== sequence || !canvasRef.current) return
        elementBoundsRef.current = elementBounds
        const canvas = canvasRef.current
        canvas.width = output.width
        canvas.height = output.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('This browser could not publish the map.')
        context.drawImage(output, 0, 0)
      })
      .catch((error) => {
        if (controller.signal.aborted || renderSequence.current !== sequence) return
        appendNotices([{
          level: 'error',
          text: `Map rendering failed: ${error instanceof Error ? error.message : String(error)}`,
        }])
      })
      .finally(() => {
        if (renderSequence.current === sequence && !interacting) setBusy(false)
      })
    return () => controller.abort()
  }, [
    appendNotices,
    annotations,
    canvasRef,
    centerlineStationing,
    elementBoundsRef,
    engine,
    enabled,
    interacting,
    overlays,
    scene,
    selectedAnnotationId,
    selectedElementKey,
    setBusy,
    settings,
  ])
}
