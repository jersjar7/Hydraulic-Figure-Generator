import { CROSS_SECTION_FIGURE_ID } from '../../core/figureIds'
import type { CrossSectionLine } from '../../core/types'
import type { HydraulicProjectDocument } from '../project-document/hydraulicProjectDocument'
import type { ScenarioSelection } from '../project-session/useProjectSession'
import {
  createDefaultCrossSectionSettings,
  type CrossSectionFigureSettings,
} from './crossSectionSettings'

export const CROSS_SECTION_PROJECT_VERSION = 1

export type CrossSectionProjectState = {
  settings: CrossSectionFigureSettings
  selectedLine: CrossSectionLine | null
  selectedAssessmentLineId: string
  scenarioSelection: ScenarioSelection
  project: HydraulicProjectDocument
}

type CrossSectionProjectEnvelope = CrossSectionProjectState & {
  version: number
  figureId: typeof CROSS_SECTION_FIGURE_ID
}

function finitePoint(point: unknown) {
  if (!point || typeof point !== 'object') return false
  const value = point as { x?: unknown; y?: unknown }
  return Number.isFinite(value.x) && Number.isFinite(value.y)
}

function validLine(line: unknown): line is CrossSectionLine | null {
  if (line == null) return true
  if (!line || typeof line !== 'object') return false
  const value = line as Partial<CrossSectionLine>
  return (
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    (value.direction === 'a-to-b' || value.direction === 'b-to-a') &&
    Array.isArray(value.points) &&
    value.points.length >= 2 &&
    value.points.every(finitePoint)
  )
}

function hydrateSettings(value: unknown): CrossSectionFigureSettings {
  if (!value || typeof value !== 'object') {
    throw new Error('Cross-section settings are missing.')
  }
  const incoming = value as Partial<CrossSectionFigureSettings>
  const defaults = createDefaultCrossSectionSettings()
  const settings = {
    ...defaults,
    ...incoming,
    existingGroundStyle: {
      ...defaults.existingGroundStyle,
      ...incoming.existingGroundStyle,
    },
    proposedGroundStyle: {
      ...defaults.proposedGroundStyle,
      ...incoming.proposedGroundStyle,
    },
    existingWseStyle: {
      ...defaults.existingWseStyle,
      ...incoming.existingWseStyle,
    },
    proposedWseStyle: {
      ...defaults.proposedWseStyle,
      ...incoming.proposedWseStyle,
    },
  }
  if (
    !Number.isFinite(settings.dryDepth) ||
    settings.dryDepth < 0 ||
    !Number.isFinite(settings.sampleSpacing) ||
    settings.sampleSpacing <= 0 ||
    !Number.isFinite(settings.fontSize) ||
    settings.fontSize < 8
  ) {
    throw new Error('Cross-section settings contain invalid numeric values.')
  }
  return settings
}

export function serializeCrossSectionProject(
  state: CrossSectionProjectState,
) {
  const envelope: CrossSectionProjectEnvelope = {
    version: CROSS_SECTION_PROJECT_VERSION,
    figureId: CROSS_SECTION_FIGURE_ID,
    ...state,
  }
  return JSON.stringify(envelope, null, 2)
}

export function parseCrossSectionProject(
  text: string,
): CrossSectionProjectState {
  const parsed = JSON.parse(text) as Partial<CrossSectionProjectEnvelope>
  if (parsed.figureId !== CROSS_SECTION_FIGURE_ID) {
    throw new Error('This is not a Cross-Section Comparison project file.')
  }
  if (parsed.version !== CROSS_SECTION_PROJECT_VERSION) {
    throw new Error(
      `Cross-section project version ${String(parsed.version)} is not supported.`,
    )
  }
  if (!validLine(parsed.selectedLine)) {
    throw new Error('The saved cross-section line is malformed.')
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
    selectedLine: parsed.selectedLine ?? null,
    selectedAssessmentLineId:
      typeof parsed.selectedAssessmentLineId === 'string'
        ? parsed.selectedAssessmentLineId
        : '',
    scenarioSelection: parsed.scenarioSelection as ScenarioSelection,
    project: parsed.project,
  }
}
