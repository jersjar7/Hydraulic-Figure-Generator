import { useEffect, useRef, type RefObject } from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  AssessmentMapLayer,
  FigureSettings,
  IngestNotice,
  MapAnnotation,
  MapElementBounds,
  MapElementKey,
  MapOverlay,
  WseDifferenceScene,
} from '../../core/types'
import { wseDifferenceFigure } from './wseDifferenceFigure'

type WseMapRenderingOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  scene: WseDifferenceScene | null
  engine: HydraulicEngine
  settings: FigureSettings
  overlays: MapOverlay[]
  assessment: AssessmentMapLayer
  annotations: MapAnnotation[]
  selectedAnnotationId: string | null
  selectedElementKey: MapElementKey | null
  interacting: boolean
  setBusy: (busy: boolean) => void
  appendNotices: (notices: IngestNotice[]) => void
}

export function useWseMapRendering({
  canvasRef,
  scene,
  engine,
  settings,
  overlays,
  assessment,
  annotations,
  selectedAnnotationId,
  selectedElementKey,
  interacting,
  setBusy,
  appendNotices,
}: WseMapRenderingOptions) {
  const renderSequence = useRef(0)
  const elementBoundsRef = useRef<MapElementBounds[]>([])

  useEffect(() => {
    if (!scene || !canvasRef.current) return

    const sequence = ++renderSequence.current
    const renderCanvas = document.createElement('canvas')
    const controller = new AbortController()
    if (!interacting) setBusy(true)

    void wseDifferenceFigure
      .render({
        canvas: renderCanvas,
        scene,
        commonBounds: engine.commonBounds(),
        settings,
        overlays,
        assessment,
        annotations,
        selectedAnnotationId,
        selectedElementKey,
        signal: controller.signal,
      })
      .then((elementBounds) => {
        if (renderSequence.current !== sequence || !canvasRef.current) return
        elementBoundsRef.current = elementBounds
        const visibleCanvas = canvasRef.current
        visibleCanvas.width = renderCanvas.width
        visibleCanvas.height = renderCanvas.height
        const context = visibleCanvas.getContext('2d')
        if (!context) {
          throw new Error('This browser could not publish the rendered map.')
        }
        context.drawImage(renderCanvas, 0, 0)
      })
      .catch((error) => {
        if (renderSequence.current !== sequence) return
        appendNotices([
          {
            level: 'error',
            text: `Map rendering failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ])
      })
      .finally(() => {
        if (renderSequence.current === sequence && !interacting) {
          setBusy(false)
        }
      })

    return () => controller.abort()
  }, [
    annotations,
    appendNotices,
    assessment,
    canvasRef,
    engine,
    interacting,
    overlays,
    scene,
    selectedAnnotationId,
    selectedElementKey,
    setBusy,
    settings,
  ])

  return elementBoundsRef
}
