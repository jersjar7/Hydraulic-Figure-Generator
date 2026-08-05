import { HYDRAULIC_PROFILES_FIGURE_ID } from '../../core/figureIds'
import type {
  HydraulicProfileDatasetConfiguration,
  HydraulicProfileDatasetDefinition,
} from '../../core/types'
import {
  createDefaultHydraulicProfileSettings,
  defaultHydraulicProfileLineStyle,
  type HydraulicProfileFigureSettings,
  type HydraulicProfileLineStyle,
} from './hydraulicProfileSettings'

export const HYDRAULIC_PROFILE_PROJECT_VERSION = 3

export type HydraulicProfileProjectState = {
  conditionLabel: string
  summaryText: string
  profileText: string
  selectedSectionId: string
  datasetConfiguration: HydraulicProfileDatasetConfiguration | null
  settings: HydraulicProfileFigureSettings
}

type Envelope = HydraulicProfileProjectState & {
  version: number
  figureId: typeof HYDRAULIC_PROFILES_FIGURE_ID
}

type LegacyMapping = {
  groundSlot: number
  surfaceSlots: number[]
}

function isLineStyle(value: unknown): value is HydraulicProfileLineStyle {
  if (!value || typeof value !== 'object') return false
  const style = value as Partial<HydraulicProfileLineStyle>
  return typeof style.color === 'string'
    && Number.isFinite(style.width)
    && Number(style.width) > 0
    && Array.isArray(style.dash)
    && style.dash.every(Number.isFinite)
}

function isConfiguration(value: unknown): value is HydraulicProfileDatasetConfiguration {
  if (!value || typeof value !== 'object') return false
  const configuration = value as Partial<HydraulicProfileDatasetConfiguration>
  if (!Number.isInteger(configuration.datasetsPerSection) || Number(configuration.datasetsPerSection) < 1) return false
  if (!Array.isArray(configuration.definitions) || configuration.definitions.length !== configuration.datasetsPerSection) return false
  const slots = new Set<number>()
  for (const candidate of configuration.definitions) {
    const definition = candidate as Partial<HydraulicProfileDatasetDefinition>
    if (
      !Number.isInteger(definition.slot)
      || Number(definition.slot) < 0
      || Number(definition.slot) >= Number(configuration.datasetsPerSection)
      || typeof definition.name !== 'string'
      || !['ground', 'wse', 'other'].includes(String(definition.kind))
    ) return false
    slots.add(Number(definition.slot))
  }
  return slots.size === configuration.datasetsPerSection
    && (configuration.stationReferenceSlot == null
      || slots.has(configuration.stationReferenceSlot))
}

function conditionGroundLabel(conditionLabel: string) {
  const condition = conditionLabel.replace(/\s*conditions?\s*/i, ' ').trim()
  return `${condition ? `${condition} ` : ''}Ground`
}

function legacyConfiguration(parsed: Record<string, unknown>) {
  const eventNames = parsed.eventNames
  const mapping = parsed.datasetMapping as Partial<LegacyMapping> | null | undefined
  if (
    !Array.isArray(eventNames)
    || eventNames.length === 0
    || !eventNames.every((name) => typeof name === 'string')
  ) throw new Error('The saved SMS profile inputs are malformed.')
  const count = eventNames.length + 1
  const validMapping = mapping
    && Number.isInteger(mapping.groundSlot)
    && Array.isArray(mapping.surfaceSlots)
    && mapping.surfaceSlots.length === eventNames.length
    && mapping.surfaceSlots.every((slot) => Number.isInteger(slot))
  const groundSlot = validMapping ? Number(mapping.groundSlot) : 0
  const surfaceSlots = validMapping
    ? mapping.surfaceSlots!.map(Number)
    : eventNames.map((_, index) => index + 1)
  const definitions: HydraulicProfileDatasetDefinition[] = Array.from(
    { length: count },
    (_, slot) => ({ slot, name: `Dataset ${slot + 1}`, kind: 'other' }),
  )
  definitions[groundSlot] = {
    slot: groundSlot,
    name: conditionGroundLabel(String(parsed.conditionLabel ?? '')),
    kind: 'ground',
  }
  surfaceSlots.forEach((slot, index) => {
    definitions[slot] = { slot, name: String(eventNames[index]), kind: 'wse' }
  })
  return {
    configuration: {
      datasetsPerSection: count,
      definitions,
      stationReferenceSlot: groundSlot,
    } satisfies HydraulicProfileDatasetConfiguration,
    mapping: { groundSlot, surfaceSlots },
  }
}

function hydrateSettings(
  value: unknown,
  legacyMapping: LegacyMapping | null = null,
): HydraulicProfileFigureSettings {
  if (!value || typeof value !== 'object') throw new Error('Profile settings are missing.')
  const incoming = value as Partial<HydraulicProfileFigureSettings> & {
    groundStyle?: HydraulicProfileLineStyle
    surfaceStyles?: HydraulicProfileLineStyle[]
  }
  const defaults = createDefaultHydraulicProfileSettings()
  let lineStyles = Array.isArray(incoming.lineStyles)
    ? incoming.lineStyles.map((style, slot) => ({
        ...defaultHydraulicProfileLineStyle(slot),
        ...style,
      }))
    : [...defaults.lineStyles]
  if (legacyMapping) {
    const requiredCount = Math.max(
      legacyMapping.groundSlot,
      ...legacyMapping.surfaceSlots,
    ) + 1
    lineStyles = Array.from({ length: Math.max(requiredCount, defaults.lineStyles.length) }, (_, slot) =>
      defaultHydraulicProfileLineStyle(slot),
    )
    if (isLineStyle(incoming.groundStyle)) {
      lineStyles[legacyMapping.groundSlot] = incoming.groundStyle
    }
    legacyMapping.surfaceSlots.forEach((slot, index) => {
      const style = incoming.surfaceStyles?.[index]
      if (isLineStyle(style)) lineStyles[slot] = style
    })
  }
  const settings: HydraulicProfileFigureSettings = {
    ...defaults,
    ...incoming,
    earthFillGroundSlot: Number.isInteger(incoming.earthFillGroundSlot)
      ? Number(incoming.earthFillGroundSlot)
      : null,
    clipWseAtGround: typeof incoming.clipWseAtGround === 'boolean'
      ? incoming.clipWseAtGround
      : defaults.clipWseAtGround,
    wseClippingGroundSlot: Number.isInteger(incoming.wseClippingGroundSlot)
      ? Number(incoming.wseClippingGroundSlot)
      : null,
    inundationGroundSlot: Number.isInteger(incoming.inundationGroundSlot)
      ? Number(incoming.inundationGroundSlot)
      : null,
    inundationSurfaceSlot: Number.isInteger(incoming.inundationSurfaceSlot)
      ? Number(incoming.inundationSurfaceSlot)
      : null,
    lineStyles,
  }
  if (
    !Number.isFinite(settings.fontSize)
    || settings.fontSize < 8
    || settings.lineStyles.length === 0
    || settings.lineStyles.some((style) => !isLineStyle(style))
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
  const parsed = JSON.parse(text) as Partial<Envelope> & Record<string, unknown>
  if (parsed.figureId !== HYDRAULIC_PROFILES_FIGURE_ID) throw new Error('This is not a Hydraulic Profiles & Sections project file.')
  if (![1, 2, HYDRAULIC_PROFILE_PROJECT_VERSION].includes(Number(parsed.version))) {
    throw new Error(`Hydraulic profile project version ${String(parsed.version)} is not supported.`)
  }
  if (
    typeof parsed.conditionLabel !== 'string'
    || typeof parsed.summaryText !== 'string'
    || typeof parsed.profileText !== 'string'
  ) throw new Error('The saved SMS profile inputs are malformed.')
  if (parsed.version === 1 || parsed.version === 2) {
    const legacy = legacyConfiguration(parsed)
    return {
      conditionLabel: parsed.conditionLabel,
      summaryText: parsed.summaryText,
      profileText: parsed.profileText,
      selectedSectionId: typeof parsed.selectedSectionId === 'string' ? parsed.selectedSectionId : '',
      datasetConfiguration: legacy.configuration,
      settings: hydrateSettings(parsed.settings, legacy.mapping),
    }
  }
  const datasetConfiguration = parsed.datasetConfiguration == null
    ? null
    : isConfiguration(parsed.datasetConfiguration)
      ? parsed.datasetConfiguration
      : (() => { throw new Error('The saved dataset definitions are malformed.') })()
  return {
    conditionLabel: parsed.conditionLabel,
    summaryText: parsed.summaryText,
    profileText: parsed.profileText,
    selectedSectionId: typeof parsed.selectedSectionId === 'string' ? parsed.selectedSectionId : '',
    datasetConfiguration,
    settings: hydrateSettings(parsed.settings),
  }
}
