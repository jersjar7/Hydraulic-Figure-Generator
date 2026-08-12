import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type {
  HydraulicCrossSectionCulvert,
  HydraulicLongitudinalScene,
  HydraulicProfileDataset,
  HydraulicProfileDatasetConfiguration,
  HydraulicProfileScene,
  HydraulicProfileView,
  IngestNotice,
} from '../../core/types'
import { hydraulicProfileFigure } from './hydraulicProfileFigure'

type Options = {
  conditionLabel: string
  dataset: HydraulicProfileDataset
  selectedSectionId: string
  setSelectedSectionId: Dispatch<SetStateAction<string>>
  currentCrossSectionCulvert: HydraulicCrossSectionCulvert | null
  longitudinalCandidate: HydraulicLongitudinalScene | null
  longitudinalProfileText: string
  datasetConfiguration: HydraulicProfileDatasetConfiguration | null
  hydrationRevision: number
  view: HydraulicProfileView
  appendNotices(notices: IngestNotice[]): void
}

function buildCrossSectionScenes(
  conditionLabel: string,
  dataset: HydraulicProfileDataset,
) {
  return dataset.sections.map((section) =>
    hydraulicProfileFigure.buildScene({ conditionLabel, section }),
  )
}

export function useHydraulicProfileGeneration({
  conditionLabel,
  dataset,
  selectedSectionId,
  setSelectedSectionId,
  currentCrossSectionCulvert,
  longitudinalCandidate,
  longitudinalProfileText,
  datasetConfiguration,
  hydrationRevision,
  view,
  appendNotices,
}: Options) {
  const [scenes, setScenes] = useState<HydraulicProfileScene[]>([])
  const [longitudinalGenerated, setLongitudinalGenerated] = useState(false)
  const baseScene = useMemo(
    () => scenes.find(({ section }) => section.id === selectedSectionId)
      ?? scenes[0]
      ?? null,
    [scenes, selectedSectionId],
  )
  const scene = useMemo(
    () => baseScene
      ? { ...baseScene, culvert: currentCrossSectionCulvert }
      : null,
    [baseScene, currentCrossSectionCulvert],
  )
  const longitudinalScene = longitudinalGenerated ? longitudinalCandidate : null
  const crossSectionsReady = dataset.sections.length > 0 && dataset.mappingStatus.ready
  const longitudinalReady = Boolean(longitudinalCandidate?.lines.length)
  const ready = view === 'longitudinal' ? longitudinalReady : crossSectionsReady
  const generationLabel = view === 'longitudinal'
    ? `${longitudinalGenerated ? 'Regenerate' : 'Generate'} longitudinal profile`
    : dataset.sections.length > 0
      ? `${scenes.length > 0 ? 'Regenerate' : 'Generate'} ${dataset.sections.length} cross section${dataset.sections.length === 1 ? '' : 's'}`
      : 'Generate cross sections'
  const generationHint = ready
    ? undefined
    : view === 'longitudinal'
      ? 'Add Longitudinal SMS Profile Values matching the dataset definitions'
      : dataset.sections.length > 0
        ? 'Review the dataset mapping before generating'
        : 'Paste and review one complete SMS profile first'

  useEffect(() => {
    if (!dataset.sections.some(({ id }) => id === selectedSectionId)) {
      const nextSectionId = dataset.sections[0]?.id ?? ''
      if (nextSectionId !== selectedSectionId) setSelectedSectionId(nextSectionId)
    }
  }, [dataset.sections, selectedSectionId, setSelectedSectionId])

  useEffect(() => setScenes([]), [conditionLabel, dataset])
  useEffect(
    () => setLongitudinalGenerated(false),
    [datasetConfiguration, longitudinalProfileText],
  )

  useEffect(() => {
    if (hydrationRevision === 0) return
    if (crossSectionsReady) {
      setScenes(buildCrossSectionScenes(conditionLabel, dataset))
    }
    setLongitudinalGenerated(Boolean(longitudinalCandidate?.lines.length))
  }, [
    conditionLabel,
    crossSectionsReady,
    dataset,
    hydrationRevision,
    longitudinalCandidate?.lines.length,
  ])

  const generate = useCallback(() => {
    try {
      if (view === 'longitudinal') {
        if (!longitudinalCandidate?.lines.length) {
          throw new Error(
            'Add one complete Longitudinal SMS Profile Values set that matches the dataset definitions.',
          )
        }
        setLongitudinalGenerated(true)
        appendNotices([{
          level: 'success',
          text: 'Generated longitudinal hydraulic profile.',
        }])
        return
      }

      const nextScenes = buildCrossSectionScenes(conditionLabel, dataset)
      setScenes(nextScenes)
      if (!nextScenes.some(({ section }) => section.id === selectedSectionId)) {
        setSelectedSectionId(nextScenes[0]?.section.id ?? '')
      }
      appendNotices([{
        level: 'success',
        text: `Generated ${nextScenes.length} hydraulic cross section${nextScenes.length === 1 ? '' : 's'}.`,
      }])
    } catch (caught) {
      appendNotices([{
        level: 'error',
        text: caught instanceof Error ? caught.message : String(caught),
      }])
    }
  }, [
    appendNotices,
    conditionLabel,
    dataset,
    longitudinalCandidate,
    selectedSectionId,
    setSelectedSectionId,
    view,
  ])

  const resetGenerated = useCallback(() => {
    setScenes([])
    setLongitudinalGenerated(false)
  }, [])

  return {
    scenes,
    scene,
    longitudinalScene,
    ready,
    generationLabel,
    generationHint,
    generate,
    resetGenerated,
  }
}
