import type { ConditionData } from '../types'

export function conditionNodeCountsMatch(condition: ConditionData) {
  if (!condition.geometry || !condition.datasets) return false
  const expected = condition.geometry.N
  const nodeCounts = condition.datasets.runs.flatMap((run) =>
    Object.values(run.params)
      .map((param) => param.shape[1])
      .filter((count): count is number => Number.isInteger(count)),
  )
  return nodeCounts.length > 0 && nodeCounts.every((count) => count === expected)
}
