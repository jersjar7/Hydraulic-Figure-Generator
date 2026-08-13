import type {
  Dispatch,
  SetStateAction,
} from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  ConditionKey,
  FigureSettings,
  IngestNotice,
  WseAssessmentLineCollection,
  WseDifferenceScene,
} from '../../core/types'
import { generateWseAssessmentLines } from '../../application/hydraulics/generateWseAssessmentLines'
import { wseDifferenceFigure } from './wseDifferenceFigure'

type WseGenerationControllerOptions = {
  engine: HydraulicEngine
  baselineId: ConditionKey
  baselineRun: number
  baselineLabel: string
  comparisonId: ConditionKey
  comparisonRun: number
  assessmentId: ConditionKey
  assessmentRun: number
  assessmentLabel: string
  settings: FigureSettings
  setScene: Dispatch<SetStateAction<WseDifferenceScene | null>>
  setAssessmentCollection: (
    collection: WseAssessmentLineCollection,
  ) => void
  setBusy: (busy: boolean) => void
  appendNotices: (notices: IngestNotice[]) => void
  closePanels: () => void
}

export function useWseGenerationController({
  engine,
  baselineId,
  baselineRun,
  baselineLabel,
  comparisonId,
  comparisonRun,
  assessmentId,
  assessmentRun,
  assessmentLabel,
  settings,
  setScene,
  setAssessmentCollection,
  setBusy,
  appendNotices,
  closePanels,
}: WseGenerationControllerOptions) {
  const generateAssessmentLines = () => {
    setBusy(true)
    try {
      const collection = generateWseAssessmentLines(engine, {
        scenarioId: assessmentId,
        run: assessmentRun,
        dryDepth: settings.dryDepth,
        interval: settings.assessmentLineInterval,
      })
      if (collection.lines.length === 0) {
        throw new Error(
          `No ${assessmentLabel} WSE assessment lines were found at this interval and dry-depth threshold.`,
        )
      }
      setAssessmentCollection(collection)
      appendNotices([
        {
          level: 'success',
          text: `Generated ${collection.lines.length.toLocaleString()} ${assessmentLabel} WSE assessment lines across ${collection.levelCount.toLocaleString()} elevation levels.`,
        },
      ])
      return collection
    } catch (error) {
      appendNotices([
        {
          level: 'error',
          text: error instanceof Error ? error.message : String(error),
        },
      ])
      return null
    } finally {
      setBusy(false)
    }
  }

  const generateMap = () => {
    setBusy(true)
    try {
      const nextScene = wseDifferenceFigure.buildScene({
        engine,
        baselineId,
        baselineRun,
        comparisonId,
        comparisonRun,
        dryDepth: settings.dryDepth,
      })
      setScene(nextScene)
      appendNotices([
        {
          level: 'success',
          text: `WSE difference ready from ${nextScene.validDifferenceNodes.toLocaleString()} comparable ${baselineLabel} nodes.`,
        },
      ])
      closePanels()
    } catch (error) {
      appendNotices([
        {
          level: 'error',
          text: error instanceof Error ? error.message : String(error),
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  return { generateAssessmentLines, generateMap }
}
