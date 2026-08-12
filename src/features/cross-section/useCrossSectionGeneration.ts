import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  ConditionKey,
  CrossSectionLine,
  HydraulicCrossSectionScene,
  IngestNotice,
  WseDifferenceScene,
} from '../../core/types'
import type { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import { wseDifferenceFigure } from '../wse-difference/wseDifferenceFigure'
import { crossSectionFigure } from './crossSectionFigure'
import type { CrossSectionFigureSettings } from './crossSectionSettings'

type Options = {
  engine: HydraulicEngine
  baselineId: ConditionKey
  baselineRun: number
  comparisonId: ConditionKey
  comparisonRun: number
  assessmentId: ConditionKey
  assessmentRun: number
  assessmentInterval: number
  ready: boolean
  selectedLine: CrossSectionLine | null
  settings: CrossSectionFigureSettings
  assessmentWorkflow: ReturnType<typeof useAssessmentWorkflow>
  setBusy: Dispatch<SetStateAction<boolean>>
  appendNotices(notices: IngestNotice[]): void
  showChart(): void
}

export function useCrossSectionGeneration({
  engine,
  baselineId,
  baselineRun,
  comparisonId,
  comparisonRun,
  assessmentId,
  assessmentRun,
  assessmentInterval,
  ready,
  selectedLine,
  settings,
  assessmentWorkflow,
  setBusy,
  appendNotices,
  showChart,
}: Options) {
  const [mapScene, setMapScene] = useState<WseDifferenceScene | null>(null)
  const [chartScene, setChartScene] =
    useState<HydraulicCrossSectionScene | null>(null)

  const invalidateChart = useCallback(() => setChartScene(null), [])
  const invalidateFigures = useCallback(() => {
    setMapScene(null)
    setChartScene(null)
  }, [])

  useEffect(() => {
    setChartScene(null)
  }, [selectedLine])

  const generateSelectionMap = useCallback(() => {
    if (!ready) return
    try {
      setMapScene(wseDifferenceFigure.buildScene({
        engine,
        baselineId,
        baselineRun,
        comparisonId,
        comparisonRun,
        dryDepth: settings.dryDepth,
      }))
    } catch (error) {
      appendNotices([{
        level: 'error',
        text: error instanceof Error ? error.message : String(error),
      }])
    }
  }, [
    appendNotices,
    baselineId,
    baselineRun,
    comparisonId,
    comparisonRun,
    engine,
    ready,
    settings.dryDepth,
  ])

  useEffect(() => {
    if (ready && !mapScene) generateSelectionMap()
  }, [generateSelectionMap, mapScene, ready])

  const generateChart = () => {
    if (!selectedLine || !ready) return
    setBusy(true)
    try {
      const scene = crossSectionFigure.buildScene({
        engine,
        baselineId,
        baselineRun,
        comparisonId,
        comparisonRun,
        line: selectedLine,
        dryDepth: settings.dryDepth,
        sampleSpacing: settings.sampleSpacing,
      })
      setChartScene(scene)
      appendNotices(
        scene.warnings.map((text) => ({ level: 'warning' as const, text })),
      )
      showChart()
    } catch (error) {
      appendNotices([{
        level: 'error',
        text: `Cross section failed: ${error instanceof Error ? error.message : String(error)}`,
      }])
    } finally {
      setBusy(false)
    }
  }

  const generateAssessmentLines = () => {
    setBusy(true)
    try {
      const collection = engine.buildWseAssessmentLines(
        assessmentId,
        assessmentRun,
        settings.dryDepth,
        assessmentInterval,
      )
      assessmentWorkflow.setCollection(collection)
      appendNotices([{
        level: 'success',
        text: `Generated ${collection.lines.length} assessment-line path${collection.lines.length === 1 ? '' : 's'}.`,
      }])
    } catch (error) {
      appendNotices([{
        level: 'error',
        text: error instanceof Error ? error.message : String(error),
      }])
    } finally {
      setBusy(false)
    }
  }

  return {
    mapScene,
    chartScene,
    invalidateChart,
    invalidateFigures,
    generateSelectionMap,
    generateChart,
    generateAssessmentLines,
  }
}
