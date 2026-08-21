import type { Dispatch, SetStateAction } from 'react'
import type {
  CrossSectionLine,
  FigureSettings,
  IngestNotice,
} from '../../core/types'
import type { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import { createHydraulicProjectInputActions } from '../project-workspace/hydraulicProjectInputActions'
import type { HydraulicProjectWorkspaceValue } from '../project-workspace/hydraulicProjectWorkspaceContext'
import type { CrossSectionFigureSettings } from './crossSectionSettings'
import { createDefaultCrossSectionSettings } from './crossSectionSettings'
import { createDefaultCrossSectionMapSettings } from './crossSectionWorkspaceDefaults'
import type { useCrossSectionGeneration } from './useCrossSectionGeneration'
import type { useCrossSectionSelection } from './useCrossSectionSelection'
import type { useCrossSectionWorkspaceUi } from './useCrossSectionWorkspaceUi'
import { useCrossSectionDraftRetention } from './useCrossSectionDraftRetention'

type Options = {
  projectSession: HydraulicProjectWorkspaceValue['projectSession']
  projectDocument: HydraulicProjectWorkspaceValue['projectDocument']
  assessmentWorkflow: ReturnType<typeof useAssessmentWorkflow>
  assessmentInterval: number
  settings: CrossSectionFigureSettings
  selectedLine: CrossSectionLine | null
  selectedAssessmentLineId: string
  setAssessmentInterval: Dispatch<SetStateAction<number>>
  setSettings: Dispatch<SetStateAction<CrossSectionFigureSettings>>
  setMapSettings: Dispatch<SetStateAction<FigureSettings>>
  generation: ReturnType<typeof useCrossSectionGeneration>
  selection: ReturnType<typeof useCrossSectionSelection>
  ui: ReturnType<typeof useCrossSectionWorkspaceUi>
  appendNotices(notices: IngestNotice[]): void
}

export function useCrossSectionWorkspaceLifecycle(options: Options) {
  const workspaceDraft = useCrossSectionDraftRetention({
    settings: options.settings,
    selectedLine: options.selectedLine,
    selectedAssessmentLineId: options.selectedAssessmentLineId,
    projectSession: options.projectSession,
    projectDocument: options.projectDocument,
    setSettings: options.setSettings,
    loadSelection: options.selection.loadSelection,
    invalidateFigures: options.generation.invalidateFigures,
  })
  const projectInputs = createHydraulicProjectInputActions({
    assessmentId: options.projectSession.assessmentId,
    overlays: options.projectDocument.overlays,
    ingest: options.projectSession.ingest,
    removeCondition: options.projectSession.removeCondition,
    renameCondition: options.projectSession.renameCondition,
    applyProjectionOverride: options.projectSession.applyProjectionOverride,
    changeRole: options.projectSession.changeRole,
    changeRun: options.projectSession.changeRun,
    setOverlays: options.projectDocument.setOverlays,
    onFilesChanged: () => {
      options.generation.invalidateFigures()
      options.assessmentWorkflow.invalidate(options.assessmentInterval)
    },
    onSelectionChanged: options.generation.invalidateFigures,
    onAssessmentSourceChanged: () =>
      options.assessmentWorkflow.clear(options.assessmentInterval),
    setBusy: options.ui.setBusy,
    appendNotices: options.appendNotices,
  })

  const changeAssessmentInterval = (interval: number) => {
    options.setAssessmentInterval(interval)
    options.assessmentWorkflow.clear(interval)
  }
  const resetProject = () => {
    options.projectSession.reset()
    options.projectDocument.resetDocument()
    options.assessmentWorkflow.reset(1)
    options.setSettings(createDefaultCrossSectionSettings())
    options.setMapSettings(createDefaultCrossSectionMapSettings())
    options.setAssessmentInterval(1)
    options.generation.invalidateFigures()
    options.selection.loadSelection(null, '')
    options.ui.resetForProject()
  }

  return {
    workspaceDraft,
    projectInputs,
    changeAssessmentInterval,
    resetProject,
  }
}
