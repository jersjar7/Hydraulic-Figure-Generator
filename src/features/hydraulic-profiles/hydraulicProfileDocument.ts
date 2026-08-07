import { createDefaultHydraulicProfileSettings } from './hydraulicProfileSettings'
import type { HydraulicProfileProjectState } from './hydraulicProfileProjectFile'
import { createHydraulicProfilePresetConfiguration } from './hydraulicProfilePresets'

export function createInitialHydraulicProfileDocument(): HydraulicProfileProjectState {
  return {
    conditionLabel: 'Proposed Conditions',
    summaryText: '',
    profileText: '',
    datasetConfiguration: createHydraulicProfilePresetConfiguration('proposed'),
    selectedSectionId: '',
    settings: createDefaultHydraulicProfileSettings(),
  }
}
