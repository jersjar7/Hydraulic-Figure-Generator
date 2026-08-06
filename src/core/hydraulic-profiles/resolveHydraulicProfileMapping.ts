import type {
  HydraulicProfileDatasetConfiguration,
  HydraulicProfileMappingStatus,
} from '../types'
import type { HydraulicProfileStationReferenceScore } from './analyzeStationReferences'

function detectedReference(scores: HydraulicProfileStationReferenceScore[]) {
  const [best, runnerUp] = scores
  if (!best || best.lowestSectionCount === 0) return null
  if (runnerUp && best.lowestSectionCount === runnerUp.lowestSectionCount) return null
  return best.slot
}

export function resolveHydraulicProfileMapping(
  configuration: HydraulicProfileDatasetConfiguration,
  scores: HydraulicProfileStationReferenceScore[],
): HydraulicProfileMappingStatus {
  const recommendedSlot = detectedReference(scores)
  const configuredSlot = configuration.stationReferenceSlot
  const referenceSlot = configuredSlot ?? recommendedSlot
  const source = configuredSlot != null
    ? 'configured' as const
    : referenceSlot != null
      ? 'detected' as const
      : 'unresolved' as const
  if (referenceSlot == null) {
    return {
      ready: false,
      referenceSlot,
      recommendedSlot,
      source,
      message: 'Choose the ground profile used to order sections and assign station labels.',
    }
  }
  const definition = configuration.definitions.find(({ slot }) => slot === referenceSlot)
  if (definition?.kind !== 'ground') {
    return {
      ready: false,
      referenceSlot,
      recommendedSlot,
      source,
      message: `Dataset ${referenceSlot + 1} appears to be the station ground but is currently classified as ${definition?.kind.toUpperCase() ?? 'unknown'}. Review its dataset role before generating.`,
    }
  }
  return {
    ready: true,
    referenceSlot,
    recommendedSlot,
    source,
    message: null,
  }
}
