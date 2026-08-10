import { createDefaultHydraulicProfileSettings } from './hydraulicProfileSettings'
import type { HydraulicProfileProjectState } from './hydraulicProfileProjectFile'
import { createHydraulicProfilePresetConfiguration } from './hydraulicProfilePresets'

export function createInitialHydraulicProfileDocument(): HydraulicProfileProjectState {
  return {
    conditionLabel: 'Proposed Conditions',
    summaryText: '',
    profileText: '',
    longitudinalProfileText: '',
    view: 'cross-sections',
    datasetConfiguration: createHydraulicProfilePresetConfiguration('proposed'),
    selectedSectionId: '',
    crossSectionCulverts: [],
    longitudinalCulverts: [],
    settings: createDefaultHydraulicProfileSettings(),
  }
}
