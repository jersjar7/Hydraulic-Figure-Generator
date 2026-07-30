import type {
  ConditionKey,
  WseAssessmentLineCollection,
  WseDifferenceScene,
} from '../../core/types'

export type HydraulicAnalysisPort = {
  isReady(
    baselineKey: ConditionKey,
    comparisonKey: ConditionKey,
  ): boolean
  buildWseDifference(
    baselineKey: ConditionKey,
    baselineIndex: number,
    comparisonKey: ConditionKey,
    comparisonIndex: number,
    dryDepth: number,
  ): WseDifferenceScene
  buildWseAssessmentLines(
    scenarioKey: ConditionKey,
    runIndex: number,
    dryDepth: number,
    interval: number,
  ): WseAssessmentLineCollection
}
