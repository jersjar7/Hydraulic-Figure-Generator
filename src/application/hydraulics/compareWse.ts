import type { HydraulicAnalysisPort } from '../ports/hydraulicAnalysis'
import type { ConditionKey } from '../../core/types'

export type CompareWseRequest = {
  baselineId: ConditionKey
  baselineRun: number
  comparisonId: ConditionKey
  comparisonRun: number
  dryDepth: number
}

export function canCompareWse(
  analysis: HydraulicAnalysisPort,
  request: Pick<CompareWseRequest, 'baselineId' | 'comparisonId'>,
) {
  return analysis.isReady(request.baselineId, request.comparisonId)
}

export function compareWse(
  analysis: HydraulicAnalysisPort,
  request: CompareWseRequest,
) {
  const scene = analysis.buildWseDifference(
    request.baselineId,
    request.baselineRun,
    request.comparisonId,
    request.comparisonRun,
    request.dryDepth,
  )
  if (scene.validDifferenceNodes === 0) {
    throw new Error(
      'The selected runs have no overlapping valid WSE values at this dry-depth threshold.',
    )
  }
  return scene
}
