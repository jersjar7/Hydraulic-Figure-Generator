import type {
  HydraulicProfileDatasetConfiguration,
  SmsProfileSeries,
} from '../types'

function mean(values: number[]) {
  return values.length > 0
    ? values.reduce((total, value) => total + value, 0) / values.length
    : Number.POSITIVE_INFINITY
}

function slotMean(
  series: SmsProfileSeries[],
  datasetsPerSection: number,
  slot: number,
) {
  return mean(series.flatMap((profile, index) =>
    index % datasetsPerSection === slot
      ? profile.elevations.flatMap((value) =>
          value != null && Number.isFinite(value) ? [value] : [],
        )
      : [],
  ))
}

export function applyHydraulicProfileStationGround(
  configuration: HydraulicProfileDatasetConfiguration,
  series: SmsProfileSeries[],
  stationGroundSlot: number,
): HydraulicProfileDatasetConfiguration {
  const selected = configuration.definitions.find(({ slot }) => slot === stationGroundSlot)
  if (!selected) return configuration
  const grounds = configuration.definitions.filter(({ kind }) => kind === 'ground')
  const standardMapping = grounds.length === 1
    && configuration.definitions.every(({ kind }) => kind === 'ground' || kind === 'wse')
  if (!standardMapping) {
    return {
      ...configuration,
      stationReferenceSlot: stationGroundSlot,
      definitions: configuration.definitions.map((definition) =>
        definition.slot === stationGroundSlot
          ? { ...definition, kind: 'ground' as const }
          : definition,
      ),
    }
  }
  const eventNames = configuration.definitions
    .filter(({ kind }) => kind === 'wse')
    .sort((left, right) => left.slot - right.slot)
    .map(({ name }) => name)
  const surfaceSlots = configuration.definitions
    .filter(({ slot }) => slot !== stationGroundSlot)
    .map(({ slot }) => ({
      slot,
      mean: slotMean(series, configuration.datasetsPerSection, slot),
    }))
    .sort((left, right) => left.mean - right.mean || left.slot - right.slot)
  const surfaceNames = new Map(
    surfaceSlots.map(({ slot }, index) => [slot, eventNames[index] ?? `Event ${index + 1}`]),
  )
  return {
    ...configuration,
    stationReferenceSlot: stationGroundSlot,
    definitions: configuration.definitions.map((definition) =>
      definition.slot === stationGroundSlot
        ? { ...definition, name: grounds[0].name, kind: 'ground' as const }
        : {
            ...definition,
            name: surfaceNames.get(definition.slot) ?? definition.name,
            kind: 'wse' as const,
          },
    ),
  }
}
