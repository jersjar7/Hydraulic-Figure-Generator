import type { HydraulicAnalysisPort } from '../ports/hydraulicAnalysis'
import type {
  ConditionKey,
  CrossSectionLine,
} from '../../core/types'

export type BuildHydraulicCrossSectionRequest = {
  baselineKey: ConditionKey
  baselineRunIndex: number
  comparisonKey: ConditionKey
  comparisonRunIndex: number
  line: CrossSectionLine
  dryDepth: number
  sampleSpacing: number
}

export function buildHydraulicCrossSection(
  analysis: HydraulicAnalysisPort,
  request: BuildHydraulicCrossSectionRequest,
) {
  return analysis.buildCrossSection(
    request.baselineKey,
    request.baselineRunIndex,
    request.comparisonKey,
    request.comparisonRunIndex,
    request.line,
    request.dryDepth,
    request.sampleSpacing,
  )
}
