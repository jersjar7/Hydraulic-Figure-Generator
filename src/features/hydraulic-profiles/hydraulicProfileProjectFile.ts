import { HYDRAULIC_PROFILES_FIGURE_ID } from '../../core/figureIds'
import type { HydraulicProfileDatasetMapping } from '../../core/types'
import {
  createDefaultHydraulicProfileSettings,
  type HydraulicProfileFigureSettings,
} from './hydraulicProfileSettings'

export const HYDRAULIC_PROFILE_PROJECT_VERSION = 2

export type HydraulicProfileProjectState = {
  conditionLabel: string
  eventNames: string[]
  summaryText: string
  profileText: string
  selectedSectionId: string
  datasetMapping: HydraulicProfileDatasetMapping | null
  settings: HydraulicProfileFigureSettings
}

type Envelope = HydraulicProfileProjectState & {
  version: number
  figureId: typeof HYDRAULIC_PROFILES_FIGURE_ID
}

function hydrateSettings(value: unknown): HydraulicProfileFigureSettings {
  if (!value || typeof value !== 'object') throw new Error('Profile settings are missing.')
  const incoming = value as Partial<HydraulicProfileFigureSettings>
  const defaults = createDefaultHydraulicProfileSettings()
  const settings = {
    ...defaults,
    ...incoming,
    groundStyle: { ...defaults.groundStyle, ...incoming.groundStyle },
    surfaceStyles: Array.isArray(incoming.surfaceStyles)
      ? incoming.surfaceStyles.map((style, index) => ({
          ...(defaults.surfaceStyles[index % defaults.surfaceStyles.length]),
          ...style,
        }))
      : defaults.surfaceStyles,
  }
  if (
    !Number.isFinite(settings.fontSize) ||
    settings.fontSize < 8 ||
    settings.surfaceStyles.length === 0 ||
    settings.surfaceStyles.some((style) => !Number.isFinite(style.width) || style.width <= 0) ||
    !Number.isFinite(settings.groundStyle.width) ||
    settings.groundStyle.width <= 0
  ) throw new Error('Profile settings contain invalid numeric values.')
  return settings
}

export function serializeHydraulicProfileProject(state: HydraulicProfileProjectState) {
  const envelope: Envelope = {
    version: HYDRAULIC_PROFILE_PROJECT_VERSION,
    figureId: HYDRAULIC_PROFILES_FIGURE_ID,
    ...state,
  }
  return JSON.stringify(envelope, null, 2)
}

export function parseHydraulicProfileProject(text: string): HydraulicProfileProjectState {
  const parsed = JSON.parse(text) as Partial<Envelope>
  if (parsed.figureId !== HYDRAULIC_PROFILES_FIGURE_ID) throw new Error('This is not a Hydraulic Profiles & Sections project file.')
  if (parsed.version !== 1 && parsed.version !== HYDRAULIC_PROFILE_PROJECT_VERSION) throw new Error(`Hydraulic profile project version ${String(parsed.version)} is not supported.`)
  if (
    typeof parsed.conditionLabel !== 'string' ||
    !Array.isArray(parsed.eventNames) ||
    !parsed.eventNames.every((name) => typeof name === 'string') ||
    parsed.eventNames.length === 0 ||
    typeof parsed.summaryText !== 'string' ||
    typeof parsed.profileText !== 'string'
  ) throw new Error('The saved SMS profile inputs are malformed.')
  const candidateMapping = 'datasetMapping' in parsed ? parsed.datasetMapping : null
  const datasetMapping = candidateMapping && typeof candidateMapping === 'object'
    && Number.isInteger(candidateMapping.groundSlot)
    && Array.isArray(candidateMapping.surfaceSlots)
    && candidateMapping.surfaceSlots.every((slot) => Number.isInteger(slot))
    ? candidateMapping as HydraulicProfileDatasetMapping
    : null
  return {
    conditionLabel: parsed.conditionLabel,
    eventNames: parsed.eventNames,
    summaryText: parsed.summaryText,
    profileText: parsed.profileText,
    selectedSectionId: typeof parsed.selectedSectionId === 'string' ? parsed.selectedSectionId : '',
    datasetMapping,
    settings: hydrateSettings(parsed.settings),
  }
}
