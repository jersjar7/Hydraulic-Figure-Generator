import type {
  ConditionKey,
  CrossSectionLine,
  HydraulicCrossSectionScene,
  PlanViewResultScene,
  PlanViewOutputOption,
  ScalarResultOption,
  WseAssessmentLineCollection,
  WseDifferenceScene,
} from '../../core/types'

export type HydraulicAnalysisPort = {
  scalarResultOptions(
    key: ConditionKey,
    runIndex: number,
  ): ScalarResultOption[]
  planViewResultOptions(
    key: ConditionKey,
    runIndex: number,
  ): PlanViewOutputOption[]
  buildPlanViewResult(
    key: ConditionKey,
    runIndex: number | undefined,
    paramName: string,
  ): PlanViewResultScene
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
  buildCrossSection(
    baselineKey: ConditionKey,
    baselineIndex: number,
    comparisonKey: ConditionKey,
    comparisonIndex: number,
    line: CrossSectionLine,
    dryDepth: number,
    sampleSpacing?: number,
  ): HydraulicCrossSectionScene
}
