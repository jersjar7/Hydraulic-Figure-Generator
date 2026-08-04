import { useEffect, useRef, type RefObject } from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  IngestNotice,
  CenterlineStationLayer,
  MapOverlay,
  PlanViewResultScene,
  PlanViewResultSettings,
} from '../../core/types'
import { planViewResultFigure } from './planViewResultFigure'

type Options = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  scene: PlanViewResultScene | null
  engine: HydraulicEngine
  settings: PlanViewResultSettings
  overlays: MapOverlay[]
  centerlineStationing?: CenterlineStationLayer
  setBusy(busy: boolean): void
  appendNotices(notices: IngestNotice[]): void
}

export function usePlanViewResultRendering({
  canvasRef,
  scene,
  engine,
  settings,
  overlays,
  centerlineStationing,
  setBusy,
  appendNotices,
}: Options) {
  const renderSequence = useRef(0)

  useEffect(() => {
    if (!scene || !canvasRef.current) return
    const sequence = ++renderSequence.current
    const output = document.createElement('canvas')
    const controller = new AbortController()
    setBusy(true)
    void planViewResultFigure
      .render({
        canvas: output,
        document: {
          scene,
          view: {
            bounds: engine.commonBounds([scene.condition.key]),
            settings,
          },
          layers: { overlays, centerlineStationing },
          selection: {},
        },
        signal: controller.signal,
      })
      .then(() => {
        if (renderSequence.current !== sequence || !canvasRef.current) return
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
        if (renderSequence.current === sequence) setBusy(false)
      })
    return () => controller.abort()
  }, [
    appendNotices,
    canvasRef,
    centerlineStationing,
    engine,
    overlays,
    scene,
    setBusy,
    settings,
  ])
}
