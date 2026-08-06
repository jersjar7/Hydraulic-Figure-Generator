import type { HydraulicProfileDatasetConfiguration } from '../../core/types'

export type HydraulicProfilePresetId = 'existing' | 'proposed'

export type HydraulicProfilePreset = {
  id: HydraulicProfilePresetId
  label: string
  conditionLabel: string
  definitions: Array<{
    name: string
    kind: 'ground' | 'wse'
  }>
}

export const HYDRAULIC_PROFILE_PRESETS: HydraulicProfilePreset[] = [
  {
    id: 'existing',
    label: 'Existing',
    conditionLabel: 'Existing Conditions',
    definitions: [
      { name: 'Existing Ground', kind: 'ground' },
      { name: '2-year', kind: 'wse' },
      { name: '100-year', kind: 'wse' },
      { name: '500-year', kind: 'wse' },
    ],
  },
  {
    id: 'proposed',
    label: 'Proposed',
    conditionLabel: 'Proposed Conditions',
    definitions: [
      { name: 'Proposed Ground', kind: 'ground' },
      { name: '2-year', kind: 'wse' },
      { name: '100-year', kind: 'wse' },
      { name: '500-year', kind: 'wse' },
      { name: '2080 100-year', kind: 'wse' },
    ],
  },
]

export function createHydraulicProfilePresetConfiguration(
  presetId: HydraulicProfilePresetId,
): HydraulicProfileDatasetConfiguration {
  const preset = HYDRAULIC_PROFILE_PRESETS.find(({ id }) => id === presetId)
    ?? HYDRAULIC_PROFILE_PRESETS[1]
  return {
    datasetsPerSection: preset.definitions.length,
    definitions: preset.definitions.map((definition, slot) => ({
      slot,
      ...definition,
    })),
    stationReferenceSlot: null,
  }
}

export function matchesHydraulicProfilePreset(
  configuration: HydraulicProfileDatasetConfiguration | null,
  presetId: HydraulicProfilePresetId,
) {
  if (!configuration) return false
  const preset = HYDRAULIC_PROFILE_PRESETS.find(({ id }) => id === presetId)
  if (!preset || configuration.definitions.length !== preset.definitions.length) return false
  return configuration.definitions.every((definition, slot) => (
      definition.slot === slot
      && definition.name === preset.definitions[slot].name
      && definition.kind === preset.definitions[slot].kind
    ))
}
