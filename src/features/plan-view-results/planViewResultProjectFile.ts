import { PLAN_VIEW_RESULTS_FIGURE_ID } from '../../core/figureIds'
import { mergeElementStyles } from '../../core/figureElements'
import type { PlanViewResultSettings } from '../../core/types'
import type { HydraulicProjectDocument } from '../project-document/hydraulicProjectDocument'
import type { ScenarioSelection } from '../project-session/useProjectSession'
import { createDefaultPlanViewResultSettings } from './planViewResultSettings'

export const PLAN_VIEW_RESULT_PROJECT_VERSION = 1

export type PlanViewResultProjectState = {
  settings: PlanViewResultSettings
  scenarioSelection: ScenarioSelection
  project: HydraulicProjectDocument
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
  }
  return JSON.stringify(envelope, null, 2)
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
  if (parsed.version !== PLAN_VIEW_RESULT_PROJECT_VERSION) {
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
  }
}
