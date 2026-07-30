import type { ConditionKey } from '../../core/types'
import type { HydraulicAnalysisPort } from '../ports/hydraulicAnalysis'

export type GenerateWseAssessmentLinesRequest = {
  scenarioId: ConditionKey
  run: number
  dryDepth: number
  interval: number
}

export function generateWseAssessmentLines(
  analysis: HydraulicAnalysisPort,
  request: GenerateWseAssessmentLinesRequest,
) {
  return analysis.buildWseAssessmentLines(
    request.scenarioId,
    request.run,
    request.dryDepth,
    request.interval,
  )
}
