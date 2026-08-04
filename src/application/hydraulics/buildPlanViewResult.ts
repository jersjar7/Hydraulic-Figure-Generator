import type { HydraulicAnalysisPort } from '../ports/hydraulicAnalysis'
import type { ConditionKey } from '../../core/types'

export type BuildPlanViewResultRequest = {
  scenarioId: ConditionKey
  runIndex: number
  resultParameter: string
}

export function canBuildPlanViewResult(
  analysis: HydraulicAnalysisPort,
  request: BuildPlanViewResultRequest,
) {
  return analysis
    .scalarResultOptions(request.scenarioId, request.runIndex)
    .some((option) => option.paramName === request.resultParameter)
}

export function buildPlanViewResult(
  analysis: HydraulicAnalysisPort,
  request: BuildPlanViewResultRequest,
) {
  return analysis.buildPlanViewResult(
    request.scenarioId,
    request.runIndex,
    request.resultParameter,
  )
}
