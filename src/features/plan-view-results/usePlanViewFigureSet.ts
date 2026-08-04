import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { runBoundedFigureQueue } from '../../application/figure-sets/boundedFigureQueue'
import type {
  ConditionData,
  FigureSetItemRuntime,
  IngestNotice,
  MapOverlay,
  PlanViewResultScene,
  PlanViewResultSettings,
} from '../../core/types'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import {
  createPlanViewFigureSetDocument,
  type PlanViewFigureSetDocument,
  type PlanViewFigureSetItem,
  type PlanViewFigureSetScope,
} from './planViewFigureSet'
import { planViewFigureSetRecipe } from './planViewFigureSetRecipe'

type Options = {
  engine: HydraulicEngine
  scenarios: ConditionData[]
  baselineId: string
  runByScenario: Record<string, number>
  overlays: MapOverlay[]
  baseSettings: PlanViewResultSettings
  appendNotices(notices: IngestNotice[]): void
}

function defaultResult(engine: HydraulicEngine, scenarioId: string, runIndex: number) {
  const options = engine.scalarResultOptions(scenarioId, runIndex)
  return (
    options.find((option) => /Water_?Depth/i.test(option.paramName)) ??
    options[0]
  )?.paramName
}

function scopeFromItems(items: PlanViewFigureSetItem[]): PlanViewFigureSetScope {
  const scope: PlanViewFigureSetScope = {
    scenarioIds: [],
    runIndicesByScenario: {},
    resultParametersByScenario: {},
  }
  for (const item of items) {
    const { scenarioId, runIndex, resultParameter } = item.selection
    if (!scope.scenarioIds.includes(scenarioId)) scope.scenarioIds.push(scenarioId)
    const runs = scope.runIndicesByScenario[scenarioId] ?? []
    if (!runs.includes(runIndex)) runs.push(runIndex)
    scope.runIndicesByScenario[scenarioId] = runs
    const results = scope.resultParametersByScenario[scenarioId] ?? []
    if (!results.includes(resultParameter)) results.push(resultParameter)
    scope.resultParametersByScenario[scenarioId] = results
  }
  return scope
}

export function usePlanViewFigureSet({
  engine,
  scenarios,
  baselineId,
  runByScenario,
  overlays,
  baseSettings,
  appendNotices,
}: Options) {
  const [scope, setScope] = useState<PlanViewFigureSetScope>({
    scenarioIds: [],
    runIndicesByScenario: {},
    resultParametersByScenario: {},
  })
  const [figureSet, setFigureSet] = useState(createPlanViewFigureSetDocument)
  const [runtime, setRuntime] = useState<Record<string, FigureSetItemRuntime>>({})
  const [activeScenarioId, setActiveScenarioId] = useState('')
  const [generating, setGenerating] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scenesRef = useRef(new Map<string, PlanViewResultScene>())

  useEffect(() => {
    const validIds = scenarios.map((scenario) => scenario.key)
    if (validIds.length === 0) return
    setScope((current) => {
      const selected = current.scenarioIds.filter((id) => validIds.includes(id))
      const scenarioIds = selected.length > 0
        ? selected
        : [validIds.includes(baselineId) ? baselineId : validIds[0]]
      const runIndicesByScenario = { ...current.runIndicesByScenario }
      const resultParametersByScenario = {
        ...current.resultParametersByScenario,
      }
      for (const scenarioId of scenarioIds) {
        const runCount = engine.runOptions(scenarioId).length
        const selectedRuns = (runIndicesByScenario[scenarioId] ?? []).filter(
          (index) => index >= 0 && index < runCount,
        )
        const runIndex = Math.min(runByScenario[scenarioId] ?? 0, runCount - 1)
        runIndicesByScenario[scenarioId] = selectedRuns.length > 0
          ? selectedRuns
          : runCount > 0 ? [Math.max(0, runIndex)] : []
        if ((resultParametersByScenario[scenarioId] ?? []).length === 0) {
          const result = defaultResult(
            engine,
            scenarioId,
            runIndicesByScenario[scenarioId][0] ?? 0,
          )
          resultParametersByScenario[scenarioId] = result ? [result] : []
        }
      }
      return { scenarioIds, runIndicesByScenario, resultParametersByScenario }
    })
    setActiveScenarioId((current) =>
      validIds.includes(current)
        ? current
        : validIds.includes(baselineId) ? baselineId : validIds[0],
    )
  }, [baselineId, engine, runByScenario, scenarios])

  const draftItems = useMemo(
    () => planViewFigureSetRecipe.expand(
      { engine, ...scope },
      baseSettings,
    ),
    [baseSettings, engine, scope],
  )

  const updateScope = useCallback(
    (update: (current: PlanViewFigureSetScope) => PlanViewFigureSetScope) => {
      setScope(update)
    },
    [],
  )

  const toggleScenario = useCallback((scenarioId: string, selected: boolean) => {
    updateScope((current) => {
      const scenarioIds = selected
        ? [...new Set([...current.scenarioIds, scenarioId])]
        : current.scenarioIds.filter((id) => id !== scenarioId)
      const next = {
        ...current,
        scenarioIds,
        runIndicesByScenario: { ...current.runIndicesByScenario },
        resultParametersByScenario: { ...current.resultParametersByScenario },
      }
      if (selected && !(scenarioId in next.runIndicesByScenario)) {
        next.runIndicesByScenario[scenarioId] = [runByScenario[scenarioId] ?? 0]
      }
      if (selected && !(scenarioId in next.resultParametersByScenario)) {
        const result = defaultResult(
          engine,
          scenarioId,
          next.runIndicesByScenario[scenarioId][0] ?? 0,
        )
        next.resultParametersByScenario[scenarioId] = result ? [result] : []
      }
      return next
    })
    if (selected) setActiveScenarioId(scenarioId)
    else if (activeScenarioId === scenarioId) {
      setActiveScenarioId(
        scope.scenarioIds.find((id) => id !== scenarioId) ?? '',
      )
    }
  }, [
    activeScenarioId,
    engine,
    runByScenario,
    scope.scenarioIds,
    updateScope,
  ])

  const toggleRun = useCallback((scenarioId: string, runIndex: number) => {
    updateScope((current) => {
      const selected = current.runIndicesByScenario[scenarioId] ?? []
      return {
        ...current,
        runIndicesByScenario: {
          ...current.runIndicesByScenario,
          [scenarioId]: selected.includes(runIndex)
            ? selected.filter((index) => index !== runIndex)
            : [...selected, runIndex].sort((a, b) => a - b),
        },
      }
    })
  }, [updateScope])

  const toggleResult = useCallback((scenarioId: string, paramName: string) => {
    updateScope((current) => {
      const selected = current.resultParametersByScenario[scenarioId] ?? []
      return {
        ...current,
        resultParametersByScenario: {
          ...current.resultParametersByScenario,
          [scenarioId]: selected.includes(paramName)
            ? selected.filter((name) => name !== paramName)
            : [...selected, paramName],
        },
      }
    })
  }, [updateScope])

  const selectAllRuns = useCallback((scenarioId: string, selected: boolean) => {
    updateScope((current) => ({
      ...current,
      runIndicesByScenario: {
        ...current.runIndicesByScenario,
        [scenarioId]: selected
          ? engine.runOptions(scenarioId).map((_, index) => index)
          : [],
      },
    }))
  }, [engine, updateScope])

  const selectAllResults = useCallback((scenarioId: string, selected: boolean) => {
    updateScope((current) => {
      const runs = current.runIndicesByScenario[scenarioId] ?? []
      const parameters = selected
        ? [...new Set(runs.flatMap((runIndex) =>
            engine.scalarResultOptions(scenarioId, runIndex).map(
              (result) => result.paramName,
            ),
          ))]
        : []
      return {
        ...current,
        resultParametersByScenario: {
          ...current.resultParametersByScenario,
          [scenarioId]: parameters,
        },
      }
    })
  }, [engine, updateScope])

  const updateRuntime = useCallback((
    id: string,
    update: FigureSetItemRuntime,
  ) => {
    setRuntime((current) => ({ ...current, [id]: update }))
  }, [])

  const generate = useCallback(async () => {
    if (draftItems.length === 0 || generating) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    scenesRef.current.clear()
    setFigureSet((current) => ({ ...current, items: draftItems }))
    setRuntime(Object.fromEntries(
      draftItems.map((item) => [item.id, { status: 'queued' as const }]),
    ))
    setGenerating(true)
    const summary = await runBoundedFigureQueue(draftItems, {
      concurrency: 2,
      signal: controller.signal,
      itemId: (item) => item.id,
      worker: (item, signal) => planViewFigureSetRecipe.generate(
        { engine, overlays },
        item,
        signal,
      ),
      onUpdate: ({ id, status, result, error }) => {
        if (result) scenesRef.current.set(id, result.scene)
        updateRuntime(id, {
          status,
          thumbnailUrl: result?.thumbnailUrl,
          error,
        })
      },
    })
    setGenerating(false)
    abortRef.current = null
    if (summary.cancelled) {
      setRuntime((current) => Object.fromEntries(
        Object.entries(current).map(([id, item]) => [
          id,
          item.status === 'ready' || item.status === 'error'
            ? item
            : { ...item, status: 'stale' },
        ]),
      ))
      appendNotices([{ level: 'warning', text: 'Figure-set generation cancelled.' }])
      return
    }
    appendNotices([{
      level: summary.failed.size > 0 ? 'warning' : 'success',
      text: `Generated ${summary.completed.size} of ${draftItems.length} figure previews${summary.failed.size > 0 ? `; ${summary.failed.size} need review` : ''}.`,
    }])
  }, [
    appendNotices,
    draftItems,
    engine,
    generating,
    overlays,
    updateRuntime,
  ])

  const cancel = useCallback(() => abortRef.current?.abort(), [])

  const markStale = useCallback(() => {
    setRuntime((current) => Object.fromEntries(
      Object.entries(current).map(([id, item]) => [
        id,
        item.status === 'ready' ? { ...item, status: 'stale' } : item,
      ]),
    ))
  }, [])

  const updateItem = useCallback((
    id: string,
    update: (item: PlanViewFigureSetItem) => PlanViewFigureSetItem,
  ) => {
    setFigureSet((current) => ({
      ...current,
      items: current.items.map((item) => item.id === id ? update(item) : item),
    }))
  }, [])

  const load = useCallback((document: PlanViewFigureSetDocument) => {
    setFigureSet(document)
    setScope(scopeFromItems(document.items))
    setActiveScenarioId(document.items[0]?.selection.scenarioId ?? '')
    setRuntime(Object.fromEntries(
      document.items.map((item) => [item.id, { status: 'stale' as const }]),
    ))
    scenesRef.current.clear()
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setFigureSet(createPlanViewFigureSetDocument())
    setRuntime({})
    setScope({
      scenarioIds: [],
      runIndicesByScenario: {},
      resultParametersByScenario: {},
    })
    scenesRef.current.clear()
    setGenerating(false)
  }, [])

  return {
    scope,
    figureSet,
    runtime,
    activeScenarioId,
    draftCount: draftItems.length,
    generating,
    setActiveScenarioId,
    setName: (name: string) => setFigureSet((current) => ({ ...current, name })),
    toggleScenario,
    toggleRun,
    toggleResult,
    selectAllRuns,
    selectAllResults,
    toggleIncluded: (id: string) => updateItem(id, (item) => ({
      ...item,
      included: !item.included,
    })),
    updateCaption: (id: string, caption: string) => updateItem(id, (item) => ({
      ...item,
      caption,
    })),
    updateItemSettings: (id: string, settings: PlanViewResultSettings) => {
      updateItem(id, (item) => ({ ...item, settings }))
      updateRuntime(id, { status: 'stale' })
    },
    sceneFor: (id: string) => scenesRef.current.get(id),
    generate,
    cancel,
    markStale,
    load,
    reset,
  }
}
