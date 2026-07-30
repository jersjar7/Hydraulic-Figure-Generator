import { useEffect, type RefObject } from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import { createWseDifferenceRenderDocument } from '../../core/mapRenderer'
import type {
  CrossSectionLine,
  FigureSettings,
  HydraulicCrossSectionScene,
  IngestNotice,
  MapOverlay,
  WseAssessmentLineCollection,
  WseDifferenceScene,
} from '../../core/types'
import { wseDifferenceFigure } from '../wse-difference/wseDifferenceFigure'
import {
  renderCrossSectionDocument,
} from './crossSectionRenderer'
import type { CrossSectionFigureSettings } from './crossSectionSettings'
import { drawCrossSectionSelectionOverlay } from './crossSectionSelectionOverlay'

type Options = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  view: 'map' | 'chart'
  chartScene: HydraulicCrossSectionScene | null
  mapScene: WseDifferenceScene | null
  engine: HydraulicEngine
  mapSettings: FigureSettings
  settings: CrossSectionFigureSettings
  overlays: MapOverlay[]
  assessmentLines: WseAssessmentLineCollection
  selectedLine: CrossSectionLine | null
  setBusy: (busy: boolean) => void
  appendNotices: (notices: IngestNotice[]) => void
}

export function useCrossSectionRendering({
  canvasRef,
  view,
  chartScene,
  mapScene,
  engine,
  mapSettings,
  settings,
  overlays,
  assessmentLines,
  selectedLine,
  setBusy,
  appendNotices,
}: Options) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (view === 'chart' && chartScene) {
      renderCrossSectionDocument(canvas, { scene: chartScene, settings })
      return
    }
    if (view !== 'map' || !mapScene) return
    const controller = new AbortController()
    setBusy(true)
    void wseDifferenceFigure
      .render({
        canvas,
        document: createWseDifferenceRenderDocument({
          scene: mapScene,
          commonBounds: engine.commonBounds(),
          settings: mapSettings,
          overlays,
          assessment: {
            lines: assessmentLines.lines,
          },
        }),
        signal: controller.signal,
      })
      .then(() => {
        if (controller.signal.aborted) return
        const context = canvas.getContext('2d')
        if (!context) {
          throw new Error('Selection overlay canvas is unavailable.')
        }
        drawCrossSectionSelectionOverlay(
          context,
          selectedLine,
          engine.commonBounds(),
          mapSettings,
          settings,
        )
      })
      .catch((error) =>
        appendNotices([
          {
            level: 'error',
            text: `Selection map failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ]),
      )
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false)
      })
    return () => controller.abort()
  }, [
    appendNotices,
    assessmentLines,
    canvasRef,
    chartScene,
    engine,
    mapScene,
    mapSettings,
    overlays,
    selectedLine,
    setBusy,
    settings,
    view,
  ])
}
