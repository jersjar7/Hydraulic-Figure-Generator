import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type { PlanViewResultSettings } from '../../core/types'
import { withPlanViewOutputSettings } from './planViewOutputSettings'

type Options = {
  engine: HydraulicEngine
  scenarioId: string
  runIndex: number
  scenarioRevision: readonly unknown[]
  settings: PlanViewResultSettings
  setSettings: Dispatch<SetStateAction<PlanViewResultSettings>>
}

export function usePlanViewResultSelection({
  engine,
  scenarioId,
  runIndex,
  scenarioRevision,
  settings,
  setSettings,
}: Options) {
  const resultOptions = useMemo(() => {
    void scenarioRevision
    return engine.planViewResultOptions(scenarioId, runIndex)
  }, [engine, runIndex, scenarioId, scenarioRevision])
  const selectedResult = resultOptions.find(
    (option) => option.paramName === settings.resultParameter,
  )

  useEffect(() => {
    if (selectedResult || resultOptions.length === 0) return
    const next =
      resultOptions.find((option) => /Water_?Depth/i.test(option.paramName)) ??
      resultOptions[0]
    setSettings((current) => withPlanViewOutputSettings(current, next))
  }, [resultOptions, selectedResult, setSettings])

  return {
    resultOptions,
    selectedResult,
    ready: Boolean(selectedResult),
  }
}
