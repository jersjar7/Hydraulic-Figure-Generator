import { useMemo } from 'react'
import { buildHydraulicProfileDataset } from '../../core/hydraulic-profiles/buildHydraulicProfileDataset'
import { buildHydraulicLongitudinalScene } from '../../core/hydraulic-profiles/buildHydraulicLongitudinalScene'
import {
  parseSmsProfileValues,
  parseSmsSummaryTable,
} from '../../core/hydraulic-profiles/smsClipboard'
import type {
  HydraulicCrossSectionCulvert,
  HydraulicLongitudinalCulvert,
  HydraulicProfileDatasetConfiguration,
  IngestNotice,
} from '../../core/types'

type Options = {
  conditionLabel: string
  summaryText: string
  profileText: string
  longitudinalProfileText: string
  datasetConfiguration: HydraulicProfileDatasetConfiguration | null
  selectedSectionId: string
  crossSectionCulverts: HydraulicCrossSectionCulvert[]
  longitudinalCulverts: HydraulicLongitudinalCulvert[]
}

export function useHydraulicProfileAnalysis({
  conditionLabel,
  summaryText,
  profileText,
  longitudinalProfileText,
  datasetConfiguration,
  selectedSectionId,
  crossSectionCulverts,
  longitudinalCulverts,
}: Options) {
  const parsedSummary = useMemo(
    () => parseSmsSummaryTable(summaryText),
    [summaryText],
  )
  const parsedProfile = useMemo(
    () => parseSmsProfileValues(profileText),
    [profileText],
  )
  const parsedLongitudinal = useMemo(
    () => parseSmsProfileValues(longitudinalProfileText),
    [longitudinalProfileText],
  )
  const dataset = useMemo(
    () => buildHydraulicProfileDataset(
      parsedProfile.value,
      parsedSummary.value,
      { datasetConfiguration },
    ),
    [datasetConfiguration, parsedProfile.value, parsedSummary.value],
  )
  const selectedSection = useMemo(
    () => dataset.sections.find(({ id }) => id === selectedSectionId) ?? null,
    [dataset.sections, selectedSectionId],
  )
  const currentCrossSectionCulvert = useMemo(
    () => selectedSection
      ? crossSectionCulverts.find(({ sectionId }) => sectionId === selectedSection.id) ?? null
      : null,
    [crossSectionCulverts, selectedSection],
  )
  const longitudinalCandidate = useMemo(
    () => buildHydraulicLongitudinalScene(parsedLongitudinal.value, {
      conditionLabel,
      configuration: datasetConfiguration,
      summaryRows: parsedSummary.value,
      culverts: longitudinalCulverts,
    }),
    [
      conditionLabel,
      datasetConfiguration,
      longitudinalCulverts,
      parsedLongitudinal.value,
      parsedSummary.value,
    ],
  )
  const notices = useMemo(() => {
    const current: IngestNotice[] = []
    const warnings = (texts: string[]) => texts.map((text): IngestNotice => ({
      level: 'warning',
      text,
    }))
    if (summaryText.trim()) current.push(...warnings(parsedSummary.warnings))
    if (profileText.trim()) {
      current.push(...warnings(parsedProfile.warnings))
      current.push(...warnings(dataset.warnings))
    }
    if (longitudinalProfileText.trim()) {
      current.push(...warnings(parsedLongitudinal.warnings))
      current.push(...warnings(longitudinalCandidate?.warnings ?? []))
    }
    return current
  }, [
    dataset.warnings,
    longitudinalCandidate?.warnings,
    longitudinalProfileText,
    parsedLongitudinal.warnings,
    parsedProfile.warnings,
    parsedSummary.warnings,
    profileText,
    summaryText,
  ])

  return {
    parsedSummary,
    parsedProfile,
    parsedLongitudinal,
    dataset,
    selectedSection,
    currentCrossSectionCulvert,
    longitudinalCandidate,
    notices,
  }
}
