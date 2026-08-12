import type {
  HydraulicLongitudinalScene,
  HydraulicProfileScene,
  IngestNotice,
  NewReportFigure,
} from '../../core/types'
import { createWorkspaceDraftSnapshot } from '../figures/workspaceDraftRepository'
import { downloadHydraulicLongitudinalPng, downloadHydraulicProfilePng } from './exportHydraulicProfile'
import type { HydraulicProfileProjectState } from './hydraulicProfileProjectFile'
import {
  createHydraulicLongitudinalReportFigure,
  createHydraulicProfileReportFigure,
} from './hydraulicProfileReportAdapter'
import type { HydraulicProfileFigureSettings } from './hydraulicProfileSettings'
import { hydraulicProfileWorkspaceDraft } from './hydraulicProfileWorkspaceDraft'

type Options = {
  snapshot: HydraulicProfileProjectState
  settings: HydraulicProfileFigureSettings
  scene: HydraulicProfileScene | null
  longitudinalScene: HydraulicLongitudinalScene | null
  scenes: HydraulicProfileScene[]
  addFigure(figure: NewReportFigure): unknown
  appendNotices(notices: IngestNotice[]): void
}

export function createHydraulicProfileOutputController({
  snapshot,
  settings,
  scene,
  longitudinalScene,
  scenes,
  addFigure,
  appendNotices,
}: Options) {
  const captureDraft = (selectedSectionId = snapshot.selectedSectionId) =>
    createWorkspaceDraftSnapshot(hydraulicProfileWorkspaceDraft, {
      ...snapshot,
      selectedSectionId,
    })

  const createCrossSectionFigure = (generatedScene: HydraulicProfileScene) =>
    createHydraulicProfileReportFigure(
      { scene: generatedScene, settings },
      captureDraft(generatedScene.section.id),
    )

  const createExportFigure = () => {
    if (snapshot.view === 'longitudinal') {
      return longitudinalScene
        ? createHydraulicLongitudinalReportFigure(
            longitudinalScene,
            settings,
            captureDraft(),
          )
        : null
    }
    return scene ? createCrossSectionFigure(scene) : null
  }

  const addAllToExport = () => {
    if (scenes.length === 0) return
    scenes.forEach((generatedScene) => addFigure(
      createCrossSectionFigure(generatedScene),
    ))
    appendNotices([{
      level: 'success',
      text: `${scenes.length} hydraulic cross sections were added to the Export Collection.`,
    }])
  }

  const download = () => {
    if (snapshot.view === 'longitudinal' && longitudinalScene) {
      downloadHydraulicLongitudinalPng(longitudinalScene, settings)
    } else if (scene) {
      downloadHydraulicProfilePng(scene, settings)
    }
  }

  return { createExportFigure, addAllToExport, download }
}
