import { PLAN_VIEW_RESULTS_FIGURE_ID } from '../../core/figureIds'
import { mergeElementStyles } from '../../core/figureElements'
import type { PlanViewResultSettings } from '../../core/types'
import type { HydraulicProjectDocument } from '../project-document/hydraulicProjectDocument'
import type { ScenarioSelection } from '../project-session/useProjectSession'
import { createDefaultPlanViewResultSettings } from './planViewResultSettings'
import {
  createPlanViewFigureSetDocument,
  PLAN_VIEW_FIGURE_SET_RECIPE_ID,
  type PlanViewFigureSetDocument,
  type PlanViewFigureSetItem,
} from './planViewFigureSet'

export const PLAN_VIEW_RESULT_PROJECT_VERSION = 2

export type PlanViewResultProjectState = {
  settings: PlanViewResultSettings
  scenarioSelection: ScenarioSelection
  project: HydraulicProjectDocument
  figureSet?: PlanViewFigureSetDocument
}

type Envelope = PlanViewResultProjectState & {
  version: number
  figureId: typeof PLAN_VIEW_RESULTS_FIGURE_ID
}

export function serializePlanViewResultProject(
  state: PlanViewResultProjectState,
) {
  const envelope: Envelope = {
    version: PLAN_VIEW_RESULT_PROJECT_VERSION,
    figureId: PLAN_VIEW_RESULTS_FIGURE_ID,
    ...state,
    figureSet: state.figureSet ?? createPlanViewFigureSetDocument(),
  }
  return JSON.stringify(envelope, null, 2)
}

function hydrateFigureSet(value: unknown): PlanViewFigureSetDocument {
  if (value === undefined) return createPlanViewFigureSetDocument()
  if (!value || typeof value !== 'object') {
    throw new Error('The saved figure set is malformed.')
  }
  const incoming = value as Partial<PlanViewFigureSetDocument>
  if (!Array.isArray(incoming.items)) {
    throw new Error('The saved figure set is malformed.')
  }
  const items = incoming.items.map((value): PlanViewFigureSetItem => {
    if (!value || typeof value !== 'object') {
      throw new Error('A saved figure-set item is malformed.')
    }
    const item = value as Partial<PlanViewFigureSetItem>
    const selection = item.selection
    if (
      typeof item.id !== 'string' ||
      item.recipeId !== PLAN_VIEW_FIGURE_SET_RECIPE_ID ||
      item.figureId !== PLAN_VIEW_RESULTS_FIGURE_ID ||
      !selection ||
      typeof selection.scenarioId !== 'string' ||
      !Number.isInteger(selection.runIndex) ||
      selection.runIndex < 0 ||
      typeof selection.resultParameter !== 'string'
    ) {
      throw new Error('A saved figure-set item is malformed.')
    }
    return {
      id: item.id,
      recipeId: item.recipeId,
      figureId: item.figureId,
      title: typeof item.title === 'string' ? item.title : item.id,
      caption: typeof item.caption === 'string' ? item.caption : '',
      included: item.included !== false,
      selection,
      settings: hydrateSettings(item.settings),
    }
  })
  return {
    id: typeof incoming.id === 'string' ? incoming.id : 'plan-view-results-set',
    name: typeof incoming.name === 'string'
      ? incoming.name
      : 'Plan-View Hydraulic Results',
    items,
  }
}

function hydrateSettings(value: unknown): PlanViewResultSettings {
  if (!value || typeof value !== 'object') {
    throw new Error('Plan-view result settings are missing.')
  }
  const incoming = value as Partial<PlanViewResultSettings>
  const defaults = createDefaultPlanViewResultSettings()
  const settings: PlanViewResultSettings = {
    ...defaults,
    ...incoming,
    centerlineStationing: {
      ...defaults.centerlineStationing,
      ...incoming.centerlineStationing,
      overrides: { ...(incoming.centerlineStationing?.overrides ?? {}) },
    },
    elementPositions: {
      ...defaults.elementPositions,
      ...incoming.elementPositions,
    },
    elementStyles: mergeElementStyles(
      defaults.elementStyles,
      incoming.elementStyles,
    ),
  }
  if (
    !settings.resultParameter ||
    !Number.isFinite(settings.zoom) ||
    settings.zoom <= 0 ||
    !Number.isFinite(settings.contourWidth) ||
    settings.contourWidth <= 0
  ) {
    throw new Error('Plan-view result settings contain invalid values.')
  }
  return settings
}

export function parsePlanViewResultProject(
  text: string,
): PlanViewResultProjectState {
  const parsed = JSON.parse(text) as Partial<Envelope>
  if (parsed.figureId !== PLAN_VIEW_RESULTS_FIGURE_ID) {
    throw new Error('This is not a Plan-View Hydraulic Results project file.')
  }
  if (parsed.version !== 1 && parsed.version !== PLAN_VIEW_RESULT_PROJECT_VERSION) {
    throw new Error(
      `Plan-view result project version ${String(parsed.version)} is not supported.`,
    )
  }
  if (
    !parsed.scenarioSelection ||
    typeof parsed.scenarioSelection !== 'object' ||
    !parsed.project ||
    !Array.isArray(parsed.project.overlays)
  ) {
    throw new Error('The saved hydraulic project state is malformed.')
  }
  return {
    settings: hydrateSettings(parsed.settings),
    scenarioSelection: parsed.scenarioSelection as ScenarioSelection,
    project: parsed.project,
    figureSet: hydrateFigureSet(parsed.figureSet),
  }
}
