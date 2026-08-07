import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  ConditionKey,
  ScenarioRole,
} from '../../core/types'
import type { ScenarioSelection } from './scenarioSelection'
import type { HydraulicInputReference } from '../project-lifecycle/workspaceSessionProjectFile'

export type { ScenarioSelection } from './scenarioSelection'

type ScenarioRoles = Pick<
  ScenarioSelection,
  'baselineId' | 'comparisonId' | 'assessmentId'
>

export function reconcileScenarioRoles(
  scenarioIds: ConditionKey[],
  current: ScenarioRoles,
): ScenarioRoles {
  if (scenarioIds.length === 0) return current

  const baselineId = scenarioIds.includes(current.baselineId)
    ? current.baselineId
    : scenarioIds.includes('EX')
      ? 'EX'
      : scenarioIds.includes('NA')
        ? 'NA'
        : scenarioIds[0]
  const comparisonId =
    [
      current.comparisonId,
      'PR',
      'NA',
      ...scenarioIds,
    ].find(
      (candidate) =>
        scenarioIds.includes(candidate) && candidate !== baselineId,
    ) ?? baselineId
  const assessmentId = scenarioIds.includes(current.assessmentId)
    ? current.assessmentId
    : baselineId

  return { baselineId, comparisonId, assessmentId }
}

export function useProjectSession() {
  const [engine] = useState(() => new HydraulicEngine())
  const [dataVersion, setDataVersion] = useState(0)
  const [baselineId, setBaselineId] = useState<ConditionKey>('EX')
  const [comparisonId, setComparisonId] = useState<ConditionKey>('PR')
  const [assessmentId, setAssessmentId] = useState<ConditionKey>('EX')
  const [runByScenario, setRunByScenario] = useState<
    Record<ConditionKey, number>
  >({})
  const savedLabelsRef = useRef<Record<ConditionKey, string>>({})
  const [expectedInputs, setExpectedInputs] = useState<
    readonly HydraulicInputReference[]
  >([])

  const scenarios = useMemo(
    () => {
      // The engine is mutable; the revision makes mutations observable to React.
      void dataVersion
      return engine.scenarios()
    },
    [dataVersion, engine],
  )

  const currentInputReferences = useMemo<HydraulicInputReference[]>(() =>
    scenarios.map((scenario) => ({
      scenarioKey: scenario.key,
      scenarioLabel: scenario.label,
      geometryFileName: scenario.geometryFileName ?? '',
      datasetFileName: scenario.datasetFileName ?? '',
    })),
  [scenarios])
  const inputReferences = currentInputReferences.length > 0
    ? currentInputReferences
    : expectedInputs
  const missingInputReferences = inputReferences.filter((expected) => {
    const loaded = scenarios.find((scenario) => scenario.key === expected.scenarioKey)
    return !loaded?.geometryFileName || !loaded.datasetFileName
  })

  useEffect(() => {
    const ids = scenarios.map((scenario) => scenario.key)
    if (ids.length === 0) return

    const reconciled = reconcileScenarioRoles(ids, {
      baselineId,
      comparisonId,
      assessmentId,
    })
    if (reconciled.baselineId !== baselineId) {
      setBaselineId(reconciled.baselineId)
    }
    if (reconciled.comparisonId !== comparisonId) {
      setComparisonId(reconciled.comparisonId)
    }
    if (reconciled.assessmentId !== assessmentId) {
      setAssessmentId(reconciled.assessmentId)
    }

    setRunByScenario((current) => {
      const next: Record<ConditionKey, number> = {}
      for (const id of ids) {
        const runCount = engine.runOptions(id).length
        const selected = current[id] ?? 0
        next[id] = selected < runCount ? selected : 0
      }
      const unchanged =
        Object.keys(current).length === Object.keys(next).length &&
        Object.entries(next).every(([key, value]) => current[key] === value)
      return unchanged ? current : next
    })
  }, [
    assessmentId,
    baselineId,
    comparisonId,
    engine,
    scenarios,
  ])

  const ingest = useCallback(
    async (files: File[]) => {
      const notices = await engine.ingest(files)
      for (const [key, label] of Object.entries(savedLabelsRef.current)) {
        engine.renameCondition(key, label)
      }
      setDataVersion((value) => value + 1)
      return notices
    },
    [engine],
  )

  const removeCondition = useCallback(
    (key: ConditionKey) => {
      engine.removeCondition(key)
      setRunByScenario((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
      setDataVersion((value) => value + 1)
    },
    [engine],
  )

  const renameCondition = useCallback(
    (key: ConditionKey, label: string) => {
      engine.renameCondition(key, label)
      savedLabelsRef.current[key] = label
      setDataVersion((value) => value + 1)
    },
    [engine],
  )

  const changeRole = useCallback(
    (role: ScenarioRole, key: ConditionKey) => {
      if (role === 'baseline') {
        if (key === comparisonId) setComparisonId(baselineId)
        setBaselineId(key)
        return
      }
      if (role === 'comparison') {
        if (key === baselineId) setBaselineId(comparisonId)
        setComparisonId(key)
        return
      }
      setAssessmentId(key)
    },
    [baselineId, comparisonId],
  )

  const changeRun = useCallback((key: ConditionKey, index: number) => {
    setRunByScenario((current) => ({ ...current, [key]: index }))
  }, [])

  const loadSelection = useCallback(
    (selection: Partial<ScenarioSelection>) => {
      setBaselineId(selection.baselineId ?? 'EX')
      setComparisonId(selection.comparisonId ?? 'PR')
      setAssessmentId(selection.assessmentId ?? 'EX')
      setRunByScenario(selection.runByScenario ?? {})
      savedLabelsRef.current = selection.labels ?? {}
      for (const [key, label] of Object.entries(savedLabelsRef.current)) {
        engine.renameCondition(key, label)
      }
      setDataVersion((value) => value + 1)
    },
    [engine],
  )

  const loadInputReferences = useCallback(
    (references: readonly HydraulicInputReference[]) => {
      setExpectedInputs(references.map((reference) => ({ ...reference })))
    },
    [],
  )

  const reset = useCallback(() => {
    engine.reset()
    savedLabelsRef.current = {}
    setExpectedInputs([])
    setBaselineId('EX')
    setComparisonId('PR')
    setAssessmentId('EX')
    setRunByScenario({})
    setDataVersion((value) => value + 1)
  }, [engine])

  return {
    engine,
    scenarios,
    baselineId,
    comparisonId,
    assessmentId,
    runByScenario,
    inputReferences,
    missingInputReferences,
    ingest,
    removeCondition,
    renameCondition,
    changeRole,
    changeRun,
    loadSelection,
    loadInputReferences,
    reset,
  }
}
