import { PLAN_VIEW_RESULTS_FIGURE_ID } from '../../core/figureIds'
import { mergeElementStyles } from '../../core/figureElements'
import { createDefaultAnnotationSettings } from '../../core/defaults'
import {
  annotation as parseAnnotation,
  annotationDefaults as parseAnnotationDefaults,
} from '../../core/projectFiles/documentValidation'
import {
  type AnnotationDefaults,
  createDefaultFigureDocumentSettings,
  type FigureDocumentSettings,
  type MapAnnotation,
  type PlanViewResultSettings,
} from '../../core/types'
import type { HydraulicProjectDocument } from '../project-document/hydraulicProjectDocument'
import type { ScenarioSelection } from '../project-session/useProjectSession'
import { createDefaultPlanViewResultSettings } from './planViewResultSettings'
import {
  createPlanViewFigureSetDocument,
  PLAN_VIEW_FIGURE_SET_RECIPE_ID,
  type PlanViewFigureSetDocument,
  type PlanViewFigureSetItem,
} from './planViewFigureSet'
import { isPlanViewGeometryOutput } from '../../core/hydraulics/planViewGeometryResults'
import type { PersistedCenterlineStationingSource } from '../stationing/useCenterlineStationingSource'
import { parseStationLabelOverrides } from '../../core/projectFiles/settingsValidation'
import { assertValidCartographySettings } from '../../core/cartography'
import { planViewCartographySettings } from './planViewCartography'

export const PLAN_VIEW_RESULT_PROJECT_VERSION = 9

export type PlanViewResultProjectState = {
  settings: PlanViewResultSettings
  scenarioSelection: ScenarioSelection
  project: HydraulicProjectDocument
  figureSet?: PlanViewFigureSetDocument
  figureDocument?: FigureDocumentSettings
  stationingSource?: PersistedCenterlineStationingSource
  annotations?: MapAnnotation[]
  annotationDefaults?: AnnotationDefaults
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
    figureDocument: state.figureDocument ?? createDefaultFigureDocumentSettings(),
    annotations: state.annotations ?? [],
    annotationDefaults:
      state.annotationDefaults ?? createDefaultAnnotationSettings(),
  }
  return JSON.stringify(envelope, null, 2)
}

function hydrateFigureDocument(value: unknown): FigureDocumentSettings {
  if (value === undefined) return createDefaultFigureDocumentSettings()
  if (!value || typeof value !== 'object') {
    throw new Error('The saved figure document settings are malformed.')
  }
  const defaults = createDefaultFigureDocumentSettings()
  const incoming = value as Partial<FigureDocumentSettings>
  const settings: FigureDocumentSettings = {
    title: typeof incoming.title === 'string' ? incoming.title : defaults.title,
    orientation: incoming.orientation === 'portrait' || incoming.orientation === 'landscape'
      ? incoming.orientation
      : defaults.orientation,
    marginInches: typeof incoming.marginInches === 'number'
      ? incoming.marginInches
      : defaults.marginInches,
    captionPrefix: typeof incoming.captionPrefix === 'string'
      ? incoming.captionPrefix
      : defaults.captionPrefix,
    startingFigureNumber: typeof incoming.startingFigureNumber === 'number'
      ? incoming.startingFigureNumber
      : defaults.startingFigureNumber,
  }
  if (
    !Number.isFinite(settings.marginInches) ||
    settings.marginInches < 0.25 ||
    settings.marginInches > 2 ||
    !Number.isInteger(settings.startingFigureNumber) ||
    settings.startingFigureNumber < 1
  ) {
    throw new Error('Figure document settings contain invalid values.')
  }
  return settings
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
    const rawSelection = item.selection as Partial<
      PlanViewFigureSetItem['selection'] & { kind?: string }
    > | undefined
    if (
      typeof item.id !== 'string' ||
      item.recipeId !== PLAN_VIEW_FIGURE_SET_RECIPE_ID ||
      item.figureId !== PLAN_VIEW_RESULTS_FIGURE_ID ||
      !rawSelection ||
      typeof rawSelection.scenarioId !== 'string' ||
      typeof rawSelection.resultParameter !== 'string'
    ) {
      throw new Error('A saved figure-set item is malformed.')
    }
    const selection = rawSelection.kind === 'geometry'
      ? (() => {
          if (!isPlanViewGeometryOutput(rawSelection.resultParameter!)) {
            throw new Error('A saved geometry figure-set item is malformed.')
          }
          return {
            kind: 'geometry' as const,
            scenarioId: rawSelection.scenarioId!,
            resultParameter: rawSelection.resultParameter!,
          }
        })()
      : (() => {
          const runIndex = (rawSelection as { runIndex?: number }).runIndex
          if (!Number.isInteger(runIndex) || runIndex! < 0) {
            throw new Error('A saved scalar figure-set item is malformed.')
          }
          return {
            kind: 'scalar' as const,
            scenarioId: rawSelection.scenarioId!,
            runIndex: runIndex!,
            resultParameter: rawSelection.resultParameter!,
          }
        })()
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
      overrides: parseStationLabelOverrides(
        incoming.centerlineStationing?.overrides ?? {},
        'Plan-view result settings.centerlineStationing.overrides',
      ),
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
    settings.contourWidth <= 0 ||
    !Number.isFinite(settings.meshLineWidth) ||
    settings.meshLineWidth <= 0 ||
    !Number.isFinite(settings.meshLineOpacity) ||
    settings.meshLineOpacity < 0 ||
    settings.meshLineOpacity > 1
  ) {
    throw new Error('Plan-view result settings contain invalid values.')
  }
  assertValidCartographySettings(
    planViewCartographySettings(settings),
    'Plan-view result settings',
  )
  return settings
}

function hydrateAnnotations(value: unknown) {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new Error('Plan-view annotations must be an array.')
  }
  return value
    .map((item, index) =>
      parseAnnotation(item, `annotations[${index}]`),
    )
    .filter((item): item is MapAnnotation => item !== null)
}

function hydrateAnnotationDefaults(value: unknown) {
  if (value === undefined) return createDefaultAnnotationSettings()
  return {
    ...createDefaultAnnotationSettings(),
    ...parseAnnotationDefaults(value, 'annotationDefaults'),
  }
}

function hydrateStationingSource(
  value: unknown,
): PersistedCenterlineStationingSource {
  if (value === undefined) return {}
  if (!value || typeof value !== 'object') {
    throw new Error('The saved centerline stationing source is malformed.')
  }
  const source = value as PersistedCenterlineStationingSource
  if (
    source.activeCenterlineId !== undefined &&
    typeof source.activeCenterlineId !== 'string'
  ) {
    throw new Error('The saved centerline stationing source is malformed.')
  }
  if (source.centerlines !== undefined && !Array.isArray(source.centerlines)) {
    throw new Error('The saved centerline stationing source is malformed.')
  }
  const centerlines = (source.centerlines ?? []).map((entry) => {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.centerlineId !== 'string' ||
      (entry.direction !== 'a-to-b' && entry.direction !== 'b-to-a') ||
      !Number.isFinite(entry.startStation)
    ) {
      throw new Error('A saved centerline stationing entry is malformed.')
    }
    return {
      centerlineId: entry.centerlineId,
      direction: entry.direction,
      startStation: entry.startStation,
    }
  })
  if (new Set(centerlines.map((entry) => entry.centerlineId)).size !== centerlines.length) {
    throw new Error('Saved centerline stationing entries must be unique.')
  }
  return {
    activeCenterlineId: centerlines.some(
      (entry) => entry.centerlineId === source.activeCenterlineId,
    )
      ? source.activeCenterlineId
      : centerlines[0]?.centerlineId,
    centerlines,
  }
}

export function parsePlanViewResultProject(
  text: string,
): PlanViewResultProjectState {
  const parsed = JSON.parse(text) as Partial<Envelope>
  if (parsed.figureId !== PLAN_VIEW_RESULTS_FIGURE_ID) {
    throw new Error('This is not a Plan-View Hydraulic Results project file.')
  }
  if (
    parsed.version !== 1 &&
    parsed.version !== 2 &&
    parsed.version !== 3 &&
    parsed.version !== 4 &&
    parsed.version !== 5 &&
    parsed.version !== 6 &&
    parsed.version !== 7 &&
    parsed.version !== 8 &&
    parsed.version !== PLAN_VIEW_RESULT_PROJECT_VERSION
  ) {
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
    figureDocument: hydrateFigureDocument(parsed.figureDocument),
    stationingSource: parsed.stationingSource === undefined
      ? undefined
      : hydrateStationingSource(parsed.stationingSource),
    annotations: hydrateAnnotations(parsed.annotations),
    annotationDefaults: hydrateAnnotationDefaults(parsed.annotationDefaults),
  }
}
