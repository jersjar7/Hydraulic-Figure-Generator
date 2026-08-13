import type {
  Dispatch,
  RefObject,
  SetStateAction,
} from 'react'
import type {
  FigureSettings,
  IngestNotice,
  MapElementBounds,
  WseDifferenceScene,
} from '../../core/types'
import type { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import { createHydraulicProjectInputActions } from '../project-workspace/hydraulicProjectInputActions'
import type { HydraulicProjectWorkspaceValue } from '../project-workspace/hydraulicProjectWorkspaceContext'
import type { useCenterlineStationingSource } from '../stationing/useCenterlineStationingSource'
import type { useWseEditorUi } from './useWseEditorUi'
import type { useWseFigureDocument } from './useWseFigureDocument'
import type { useWseFigureElementController } from './useWseFigureElementController'
import { useWseDraftRetention } from './useWseDraftRetention'
import { createWseStationingSourceActions } from './wseStationingSourceActions'

type Options = {
  projectSession: HydraulicProjectWorkspaceValue['projectSession']
  projectDocument: HydraulicProjectWorkspaceValue['projectDocument']
  figureDocument: ReturnType<typeof useWseFigureDocument>
  editorUi: ReturnType<typeof useWseEditorUi>
  assessmentWorkflow: ReturnType<typeof useAssessmentWorkflow>
  stationingSource: ReturnType<typeof useCenterlineStationingSource>
  figureElements: ReturnType<typeof useWseFigureElementController>
  settings: FigureSettings
  setScene: Dispatch<SetStateAction<WseDifferenceScene | null>>
  elementBoundsRef: RefObject<MapElementBounds[]>
  resetMapInteractions(): void
  appendNotices(notices: IngestNotice[]): void
}

export function useWseWorkspaceLifecycle({
  projectSession,
  projectDocument,
  figureDocument,
  editorUi,
  assessmentWorkflow,
  stationingSource,
  figureElements,
  settings,
  setScene,
  elementBoundsRef,
  resetMapInteractions,
  appendNotices,
}: Options) {
  const workspaceDraft = useWseDraftRetention({
    projectSession,
    projectDocument,
    figureDocument,
    assessmentWorkflow,
    stationingSource,
    clearElementHistory: figureElements.clearHistory,
    setScene,
  })
  const stationingSourceActions = createWseStationingSourceActions({
    sourceController: stationingSource,
    figureElements,
    setSelectedLabelId: editorUi.setSelectedStationLabelId,
  })
  const projectInputs = createHydraulicProjectInputActions({
    assessmentId: projectSession.assessmentId,
    overlays: projectDocument.overlays,
    ingest: projectSession.ingest,
    removeCondition: projectSession.removeCondition,
    renameCondition: projectSession.renameCondition,
    changeRole: projectSession.changeRole,
    changeRun: projectSession.changeRun,
    setOverlays: projectDocument.setOverlays,
    onFilesChanged: () => {
      setScene(null)
      assessmentWorkflow.invalidate(settings.assessmentLineInterval)
    },
    onSelectionChanged: () => setScene(null),
    onAssessmentSourceChanged: () =>
      assessmentWorkflow.clear(settings.assessmentLineInterval),
    setBusy: editorUi.setBusy,
    appendNotices,
  })
  const changeAssessmentInterval = (interval: number) => {
    figureDocument.updateSetting('assessmentLineInterval', interval)
    assessmentWorkflow.clear(interval)
  }
  const changeAssessmentSource = (id: string) => {
    projectSession.changeRole('assessment', id)
    assessmentWorkflow.clear(settings.assessmentLineInterval)
  }
  const changeAssessmentRun = (index: number) => {
    projectSession.changeRun(projectSession.assessmentId, index)
    assessmentWorkflow.clear(settings.assessmentLineInterval)
  }
  const resetStationingLabels = () => {
    figureElements.updateCenterlineStationing({ overrides: {} })
    editorUi.setSelectedStationLabelId(null)
  }
  const changeDryDepth = (dryDepth: number) => {
    figureDocument.updateSetting('dryDepth', dryDepth)
    setScene(null)
    assessmentWorkflow.clear(settings.assessmentLineInterval)
  }
  const resetProject = () => {
    resetMapInteractions()
    projectSession.reset()
    projectDocument.resetDocument()
    figureDocument.resetDocument()
    editorUi.resetEditorUi()
    elementBoundsRef.current = []
    figureElements.clearHistory()
    setScene(null)
    assessmentWorkflow.reset(1)
    stationingSource.reset()
  }

  return {
    workspaceDraft,
    stationingSourceActions,
    projectInputs,
    changeAssessmentInterval,
    changeAssessmentSource,
    changeAssessmentRun,
    resetStationingLabels,
    changeDryDepth,
    resetProject,
  }
}
