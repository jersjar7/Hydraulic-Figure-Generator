import { HYDRAULIC_PROFILES_FIGURE_ID } from '../../core/figureIds'
import type {
  HydraulicCrossSectionCulvert,
  HydraulicLongitudinalCulvert,
  HydraulicProfileDatasetConfiguration,
  HydraulicProfileDatasetDefinition,
  HydraulicProfileView,
} from '../../core/types'
import {
  createDefaultHydraulicProfileSettings,
  defaultHydraulicProfileLineStyle,
  type HydraulicProfileFigureSettings,
  type HydraulicProfileLineStyle,
} from './hydraulicProfileSettings'
import { HYDRAULIC_PROFILE_PRESETS } from './hydraulicProfilePresets'
import { assertValidChartStyle } from '../../core/chartStyle'
import {
  hydraulicProfileChartAxes,
  hydraulicProfileChartLayout,
  hydraulicProfileChartLegend,
} from './hydraulicProfileChartStyle'

export const HYDRAULIC_PROFILE_PROJECT_VERSION = 6

export type HydraulicProfileProjectState = {
  conditionLabel: string
  summaryText: string
  profileText: string
  longitudinalProfileText: string
  view: HydraulicProfileView
  selectedSectionId: string
  crossSectionCulverts: HydraulicCrossSectionCulvert[]
  longitudinalCulverts: HydraulicLongitudinalCulvert[]
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isDash(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => isFiniteNumber(item) && item >= 0)
}

function isCrossSectionCulvert(value: unknown): value is HydraulicCrossSectionCulvert {
  if (!value || typeof value !== 'object') return false
  const culvert = value as Partial<HydraulicCrossSectionCulvert>
  return typeof culvert.sectionId === 'string'
    && typeof culvert.name === 'string'
    && ['box', 'arch', 'circle', 'ellipse'].includes(String(culvert.kind))
    && isFiniteNumber(culvert.scour)
    && culvert.scour >= 0
    && isFiniteNumber(culvert.bed)
    && culvert.bed >= 0
    && (culvert.center == null || isFiniteNumber(culvert.center))
    && [culvert.width, culvert.height, culvert.span, culvert.rise, culvert.diameter]
      .every((item) => isFiniteNumber(item) && item > 0)
    && isFiniteNumber(culvert.legHeight)
    && culvert.legHeight >= 0
    && typeof culvert.color === 'string'
    && isFiniteNumber(culvert.lineWidth)
    && culvert.lineWidth > 0
    && isDash(culvert.dash)
}

function isLongitudinalCulvert(value: unknown): value is HydraulicLongitudinalCulvert {
  if (!value || typeof value !== 'object') return false
  const culvert = value as Partial<HydraulicLongitudinalCulvert>
  return typeof culvert.id === 'string'
    && typeof culvert.name === 'string'
    && [
      culvert.leftStation,
      culvert.rightStation,
      culvert.invertLeft,
      culvert.invertRight,
    ].every(isFiniteNumber)
    && Number(culvert.rightStation) > Number(culvert.leftStation)
    && isFiniteNumber(culvert.height)
    && culvert.height > 0
    && typeof culvert.color === 'string'
    && isFiniteNumber(culvert.lineWidth)
    && culvert.lineWidth > 0
    && isDash(culvert.dash)
}

function conditionGroundLabel(conditionLabel: string) {
  const condition = conditionLabel.replace(/\s*conditions?\s*/i, ' ').trim()
  return `${condition ? `${condition} ` : ''}Ground`
}

function migratePresetStationReference(
  configuration: HydraulicProfileDatasetConfiguration,
) {
  if (configuration.stationReferenceSlot !== 0) return configuration
  const matchesLegacyPreset = HYDRAULIC_PROFILE_PRESETS.some((preset) =>
    preset.definitions.length === configuration.definitions.length
    && configuration.definitions.every((definition, slot) => (
      definition.slot === slot
      && definition.name === preset.definitions[slot].name
      && definition.kind === preset.definitions[slot].kind
    )),
  )
  return matchesLegacyPreset
    ? { ...configuration, stationReferenceSlot: null }
    : configuration
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
    lineVisibility: Array.isArray(incoming.lineVisibility)
      ? incoming.lineVisibility.map((visible) => visible !== false)
      : [...defaults.lineVisibility],
    lineOrder: Array.isArray(incoming.lineOrder)
      && incoming.lineOrder.every((slot) => Number.isInteger(slot) && Number(slot) >= 0)
      && new Set(incoming.lineOrder).size === incoming.lineOrder.length
      ? incoming.lineOrder.map(Number)
      : [...defaults.lineOrder],
  }
  if (
    !Number.isFinite(settings.fontSize)
    || settings.fontSize < 8
    || settings.lineStyles.length === 0
    || settings.lineStyles.some((style) => !isLineStyle(style))
  ) throw new Error('Profile settings contain invalid numeric values.')
  assertValidChartStyle({
    layout: hydraulicProfileChartLayout(settings),
    legend: hydraulicProfileChartLegend(settings),
    axes: hydraulicProfileChartAxes(settings),
    lines: settings.lineStyles,
  })
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
  if (![1, 2, 3, 4, 5, HYDRAULIC_PROFILE_PROJECT_VERSION].includes(Number(parsed.version))) {
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
      longitudinalProfileText: '',
      view: 'cross-sections',
      selectedSectionId: typeof parsed.selectedSectionId === 'string' ? parsed.selectedSectionId : '',
      crossSectionCulverts: [],
      longitudinalCulverts: [],
      datasetConfiguration: legacy.configuration,
      settings: hydrateSettings(parsed.settings, legacy.mapping),
    }
  }
  const datasetConfiguration = parsed.datasetConfiguration == null
    ? null
    : isConfiguration(parsed.datasetConfiguration)
      ? Number(parsed.version) === 3
        ? migratePresetStationReference(parsed.datasetConfiguration)
        : parsed.datasetConfiguration
      : (() => { throw new Error('The saved dataset definitions are malformed.') })()
  const crossSectionCulverts = parsed.crossSectionCulverts == null
    ? []
    : Array.isArray(parsed.crossSectionCulverts)
      && parsed.crossSectionCulverts.every(isCrossSectionCulvert)
      ? parsed.crossSectionCulverts
      : (() => { throw new Error('The saved cross-section culverts are malformed.') })()
  const longitudinalCulverts = parsed.longitudinalCulverts == null
    ? []
    : Array.isArray(parsed.longitudinalCulverts)
      && parsed.longitudinalCulverts.every(isLongitudinalCulvert)
      ? parsed.longitudinalCulverts
      : (() => { throw new Error('The saved longitudinal culverts are malformed.') })()
  return {
    conditionLabel: parsed.conditionLabel,
    summaryText: parsed.summaryText,
    profileText: parsed.profileText,
    longitudinalProfileText: typeof parsed.longitudinalProfileText === 'string' ? parsed.longitudinalProfileText : '',
    view: parsed.view === 'longitudinal' ? 'longitudinal' : 'cross-sections',
    selectedSectionId: typeof parsed.selectedSectionId === 'string' ? parsed.selectedSectionId : '',
    crossSectionCulverts,
    longitudinalCulverts,
    datasetConfiguration,
    settings: hydrateSettings(parsed.settings),
  }
}
