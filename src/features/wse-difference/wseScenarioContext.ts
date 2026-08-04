import type { FigureSettings } from '../../core/types'
import type { HydraulicProjectWorkspaceValue } from '../project-workspace/hydraulicProjectWorkspaceContext'
import { wseDifferenceFigure } from './wseDifferenceFigure'

export function createWseScenarioContext(
  projectSession: HydraulicProjectWorkspaceValue['projectSession'],
  settings: FigureSettings,
) {
  const {
    engine,
    baselineId,
    comparisonId,
    assessmentId,
    runByScenario,
  } = projectSession
  const baselineRun = runByScenario[baselineId] ?? 0
  const comparisonRun = runByScenario[comparisonId] ?? 0
  const assessmentRun = runByScenario[assessmentId] ?? 0
  const baselineCondition = engine.condition(baselineId)
  const comparisonCondition = engine.condition(comparisonId)
  const assessmentCondition = engine.condition(assessmentId)

  return {
    engine,
    baselineId,
    comparisonId,
    assessmentId,
    baselineRun,
    comparisonRun,
    assessmentRun,
    assessmentCondition,
    baselineLabel: baselineCondition?.label ?? 'Baseline',
    comparisonLabel: comparisonCondition?.label ?? 'Comparison',
    assessmentLabel: assessmentCondition?.label ?? 'Assessment source',
    ready: wseDifferenceFigure.canGenerate({
      engine,
      baselineId,
      baselineRun,
      comparisonId,
      comparisonRun,
      dryDepth: settings.dryDepth,
    }),
  }
}
