import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  CartographySettings,
  IngestNotice,
  PlanViewOutputOption,
  PlanViewResultScene,
  PlanViewResultSettings,
  ScenarioRole,
} from '../../core/types'
import { withPlanViewCartographySettings } from './planViewCartography'
import type { PlanViewFigureSetItem } from './planViewFigureSet'
import { planViewResultFigure } from './planViewResultFigure'
import { createDefaultPlanViewResultSettings } from './planViewResultSettings'
import { withPlanViewOutputSettings } from './planViewOutputSettings'
import type { usePlanViewFigureSet } from './usePlanViewFigureSet'

type Options = {
  engine: HydraulicEngine
  scenarioId: string
  runIndex: number
  scenarioLabel: string
  ready: boolean
  resultOptions: PlanViewOutputOption[]
  settings: PlanViewResultSettings
  setSettings: Dispatch<SetStateAction<PlanViewResultSettings>>
  setScene: Dispatch<SetStateAction<PlanViewResultScene | null>>
  figureSet: ReturnType<typeof usePlanViewFigureSet>
  changeRole(role: ScenarioRole, scenarioId: string): void
  changeRun(scenarioId: string, runIndex: number): void
  clearElementHistory(): void
  collapseInputs(): void
  showFigure(): void
  appendNotices(notices: IngestNotice[]): void
}

export function usePlanViewSingleFigure({
  engine,
  scenarioId,
  runIndex,
  scenarioLabel,
  ready,
  resultOptions,
  settings,
  setSettings,
  setScene,
  figureSet,
  changeRole,
  changeRun,
  clearElementHistory,
  collapseInputs,
  showFigure,
  appendNotices,
}: Options) {
  const [editingFigureSetItemId, setEditingFigureSetItemId] =
    useState<string | null>(null)

  const invalidate = useCallback(() => {
    setScene(null)
    figureSet.markStale()
  }, [figureSet, setScene])

  const generate = useCallback(() => {
    if (!ready) return
    try {
      const next = planViewResultFigure.buildScene({
        engine,
        scenarioId,
        runIndex,
        resultParameter: settings.resultParameter,
      })
      setScene(next)
      collapseInputs()
      appendNotices([{
        level: 'success',
        text: `Generated ${next.result.label} from ${scenarioLabel}; ${next.validNodes.toLocaleString()} valid nodes.`,
      }])
    } catch (error) {
      appendNotices([{
        level: 'error',
        text: `Map generation failed: ${error instanceof Error ? error.message : String(error)}`,
      }])
    }
  }, [
    appendNotices,
    collapseInputs,
    engine,
    ready,
    runIndex,
    scenarioId,
    scenarioLabel,
    setScene,
    settings.resultParameter,
  ])

  const replaceSettings = useCallback((next: PlanViewResultSettings) => {
    setSettings(next)
    if (editingFigureSetItemId) {
      figureSet.updateItemSettings(editingFigureSetItemId, next)
    }
  }, [editingFigureSetItemId, figureSet, setSettings])

  const updateSetting = useCallback(
    <Key extends keyof PlanViewResultSettings>(
      key: Key,
      value: PlanViewResultSettings[Key],
    ) => replaceSettings({ ...settings, [key]: value }),
    [replaceSettings, settings],
  )

  const updateCartography = useCallback(
    (cartography: CartographySettings) => replaceSettings(
      withPlanViewCartographySettings(settings, cartography),
    ),
    [replaceSettings, settings],
  )

  const changeResult = useCallback((paramName: string) => {
    const option = resultOptions.find((item) => item.paramName === paramName)
    if (!option) return
    setSettings((current) => withPlanViewOutputSettings(current, option))
    setScene(null)
    setEditingFigureSetItemId(null)
  }, [resultOptions, setScene, setSettings])

  const openFigureSetItem = useCallback((item: PlanViewFigureSetItem) => {
    changeRole('baseline', item.selection.scenarioId)
    if (item.selection.kind === 'scalar') {
      changeRun(item.selection.scenarioId, item.selection.runIndex)
    }
    setSettings(item.settings)
    setScene(
      figureSet.sceneFor(item.id) ?? planViewResultFigure.buildScene({
        engine,
        ...item.selection,
      }),
    )
    setEditingFigureSetItemId(item.id)
    clearElementHistory()
    showFigure()
  }, [
    changeRole,
    changeRun,
    clearElementHistory,
    engine,
    figureSet,
    setScene,
    setSettings,
    showFigure,
  ])

  const reset = useCallback(() => {
    setSettings(createDefaultPlanViewResultSettings())
    setScene(null)
    setEditingFigureSetItemId(null)
  }, [setScene, setSettings])

  return {
    stopEditingFigureSetItem: () => setEditingFigureSetItemId(null),
    invalidate,
    generate,
    updateSetting,
    updateCartography,
    changeResult,
    openFigureSetItem,
    reset,
  }
}
