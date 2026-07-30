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
  selectedAssessmentLineId: string
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
  selectedAssessmentLineId,
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
    const selectedAssessment =
      assessmentLines.lines.find(
        (line) => line.id === selectedAssessmentLineId,
      ) ?? null
    const manualLine =
      selectedLine && !selectedAssessment
        ? {
            id: selectedLine.id,
            source: 'manual-cross-section',
            level: Number.NaN,
            points: selectedLine.points,
            modelPoints: [],
            lengthFeet: 0,
          }
        : null
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
            selectedLine: selectedAssessment ?? manualLine,
          },
        }),
        signal: controller.signal,
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
    selectedAssessmentLineId,
    selectedLine,
    setBusy,
    settings,
    view,
  ])
}
