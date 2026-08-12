import type { FigureSetDocument, FigureSetItem } from '../../core/types'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import { runDisplayName } from '../../core/hydraulicEngine'
import type { PlanViewResultSettings } from '../../core/types'
import {
  isPlanViewGeometryOutput,
  planViewGeometryOutputOptions,
} from '../../core/hydraulics/planViewGeometryResults'
import { withPlanViewOutputSettings } from './planViewOutputSettings'

export const PLAN_VIEW_FIGURE_SET_RECIPE_ID = 'plan-view-scalar-results'

export type PlanViewFigureSetSelection =
  | {
      kind: 'scalar'
      scenarioId: string
      runIndex: number
      resultParameter: string
    }
  | {
      kind: 'geometry'
      scenarioId: string
      resultParameter: string
    }

export type PlanViewFigureSetItem = FigureSetItem<
  PlanViewFigureSetSelection,
  PlanViewResultSettings
>

export type PlanViewFigureSetDocument = FigureSetDocument<
  PlanViewFigureSetItem
>

export type PlanViewFigureSetScope = {
  scenarioIds: string[]
  runIndicesByScenario: Record<string, number[]>
  resultParametersByScenario: Record<string, string[]>
}

export type PlanViewFigureSetCatalog = Pick<
  HydraulicEngine,
  'condition' | 'runOptions' | 'scalarResultOptions'
>

function itemId(selection: PlanViewFigureSetSelection) {
  return [
    PLAN_VIEW_FIGURE_SET_RECIPE_ID,
    selection.scenarioId,
    selection.kind === 'scalar' ? selection.runIndex : 'geometry',
    selection.resultParameter,
  ].map(encodeURIComponent).join(':')
}

function itemSettings(
  baseSettings: PlanViewResultSettings,
  result: {
    paramName: string
    label: string
    units: string
    defaultRamp: PlanViewResultSettings['ramp']
  },
) {
  return withPlanViewOutputSettings(structuredClone(baseSettings), result)
}

export function expandPlanViewFigureSet(
  catalog: PlanViewFigureSetCatalog,
  scope: PlanViewFigureSetScope,
  baseSettings: PlanViewResultSettings,
): PlanViewFigureSetItem[] {
  const items: PlanViewFigureSetItem[] = []
  for (const scenarioId of scope.scenarioIds) {
    const condition = catalog.condition(scenarioId)
    const runs = catalog.runOptions(scenarioId)
    const runIndices = scope.runIndicesByScenario[scenarioId] ?? []
    const parameters = scope.resultParametersByScenario[scenarioId] ?? []
    const geometryOptions = planViewGeometryOutputOptions(condition)
    for (const result of geometryOptions) {
      if (!parameters.includes(result.paramName)) continue
      const selection: PlanViewFigureSetSelection = {
        kind: 'geometry',
        scenarioId,
        resultParameter: result.paramName,
      }
      const title = [condition?.label ?? scenarioId, result.label].join(' - ')
      items.push({
        id: itemId(selection),
        recipeId: PLAN_VIEW_FIGURE_SET_RECIPE_ID,
        figureId: 'plan-view-hydraulic-results',
        title,
        caption: title,
        included: true,
        selection,
        settings: itemSettings(baseSettings, result),
      })
    }
    for (const runIndex of runIndices) {
      const run = runs[runIndex]
      if (!run) continue
      const options = catalog.scalarResultOptions(scenarioId, runIndex)
      for (const resultParameter of parameters) {
        if (isPlanViewGeometryOutput(resultParameter)) continue
        const result = options.find(
          (option) => option.paramName === resultParameter,
        )
        if (!result) continue
        const selection: PlanViewFigureSetSelection = {
          kind: 'scalar',
          scenarioId,
          runIndex,
          resultParameter,
        }
        const title = [
          condition?.label ?? scenarioId,
          runDisplayName(run.run.name),
          result.label,
        ].join(' - ')
        items.push({
          id: itemId(selection),
          recipeId: PLAN_VIEW_FIGURE_SET_RECIPE_ID,
          figureId: 'plan-view-hydraulic-results',
          title,
          caption: title,
          included: true,
          selection,
          settings: itemSettings(baseSettings, result),
        })
      }
    }
  }
  return items
}

export function createPlanViewFigureSetDocument(
  items: PlanViewFigureSetItem[] = [],
): PlanViewFigureSetDocument {
  return {
    id: 'plan-view-results-set',
    name: 'Plan-View Hydraulic Results',
    items,
  }
}
