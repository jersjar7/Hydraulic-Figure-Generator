import type { ConditionKey } from '../../core/types'

export type ScenarioSelection = {
  baselineId: ConditionKey
  comparisonId: ConditionKey
  assessmentId: ConditionKey
  runByScenario: Record<ConditionKey, number>
  labels?: Record<ConditionKey, string>
  crsOverrides?: Record<ConditionKey, string>
}

export function createInitialScenarioSelection(): ScenarioSelection {
  return {
    baselineId: 'EX',
    comparisonId: 'PR',
    assessmentId: 'EX',
    runByScenario: {},
  }
}
