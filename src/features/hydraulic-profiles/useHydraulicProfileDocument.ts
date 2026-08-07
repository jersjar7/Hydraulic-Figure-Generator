import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { HydraulicProfileDatasetConfiguration } from '../../core/types'
import type { HydraulicProfileFigureSettings } from './hydraulicProfileSettings'
import type { HydraulicProfileProjectState } from './hydraulicProfileProjectFile'
import { createInitialHydraulicProfileDocument } from './hydraulicProfileDocument'

export function useHydraulicProfileDocument() {
  const [snapshot, setSnapshot] = useState(createInitialHydraulicProfileDocument)
  const [hydrationRevision, setHydrationRevision] = useState(0)

  const setField = useCallback(<Key extends keyof HydraulicProfileProjectState>(
    key: Key,
    value: SetStateAction<HydraulicProfileProjectState[Key]>,
  ) => {
    setSnapshot((current) => ({
      ...current,
      [key]: typeof value === 'function'
        ? (value as (previous: HydraulicProfileProjectState[Key]) => HydraulicProfileProjectState[Key])(current[key])
        : value,
    }))
  }, [])

  const hydrate = useCallback((next: HydraulicProfileProjectState) => {
    setSnapshot(next)
    setHydrationRevision((revision) => revision + 1)
  }, [])

  const reset = useCallback(() => {
    setSnapshot(createInitialHydraulicProfileDocument())
    setHydrationRevision((revision) => revision + 1)
  }, [])

  return {
    snapshot,
    hydrationRevision,
    hydrate,
    reset,
    setConditionLabel: ((value) => setField('conditionLabel', value)) as Dispatch<SetStateAction<string>>,
    setSummaryText: ((value) => setField('summaryText', value)) as Dispatch<SetStateAction<string>>,
    setProfileText: ((value) => setField('profileText', value)) as Dispatch<SetStateAction<string>>,
    setDatasetConfiguration: ((value) => setField('datasetConfiguration', value)) as Dispatch<SetStateAction<HydraulicProfileDatasetConfiguration | null>>,
    setSelectedSectionId: ((value) => setField('selectedSectionId', value)) as Dispatch<SetStateAction<string>>,
    setSettings: ((value) => setField('settings', value)) as Dispatch<SetStateAction<HydraulicProfileFigureSettings>>,
  }
}
