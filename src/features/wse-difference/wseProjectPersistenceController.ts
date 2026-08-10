import type {
  ChangeEvent,
  Dispatch,
  SetStateAction,
} from 'react'
import type { IngestNotice, WseDifferenceScene } from '../../core/types'
import type { HydraulicProjectWorkspaceValue } from '../project-workspace/hydraulicProjectWorkspaceContext'
import type { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import type { useCenterlineStationingSource } from '../stationing/useCenterlineStationingSource'
import type { useWseEditorUi } from './useWseEditorUi'
import type { useWseFigureDocument } from './useWseFigureDocument'
import { createWseProjectFileActions } from './wseProjectFileActions'
import type { WseProjectState } from './wseProjectDocument'

type Options = {
  projectSession: HydraulicProjectWorkspaceValue['projectSession']
  projectDocument: HydraulicProjectWorkspaceValue['projectDocument']
  figureDocument: ReturnType<typeof useWseFigureDocument>
  assessmentWorkflow: ReturnType<typeof useAssessmentWorkflow>
  stationingSource: ReturnType<typeof useCenterlineStationingSource>
  editorUi: ReturnType<typeof useWseEditorUi>
  clearElementHistory(): void
  snapshot: WseProjectState
  setScene: Dispatch<SetStateAction<WseDifferenceScene | null>>
  appendNotices(notices: IngestNotice[]): void
}

export function createWseProjectPersistenceController({
  projectSession,
  projectDocument,
  figureDocument,
  assessmentWorkflow,
  stationingSource,
  editorUi,
  clearElementHistory,
  snapshot,
  setScene,
  appendNotices,
}: Options) {
  const projectFiles = createWseProjectFileActions({
    snapshot: {
      ...snapshot.document,
      ...snapshot.project,
      scenarioSelection: snapshot.scenarioSelection,
      assessment: snapshot.assessment,
    },
    currentFigure: figureDocument.document,
    currentProject: projectDocument.document,
    appendNotices,
  })

  const loadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    const loaded = await projectFiles.loadProjectFile(file)
    if (!loaded) return

    figureDocument.loadDocument(loaded.document)
    projectDocument.loadDocument(loaded.project)
    editorUi.setSelectedAnnotationId(null)
    editorUi.setSelectedStationLabelId(null)
    editorUi.setAnnotationStart(null)
    editorUi.setAnnotationPanelView('create')
    editorUi.setAnnotationPlacedView('list')
    editorUi.setAnnotationEditorView('content')
    editorUi.setLeftCollapsed(false)
    projectSession.loadSelection(loaded.scenarioSelection)
    setScene(null)
    assessmentWorkflow.load(
      loaded.assessment,
      loaded.document.settings.assessmentLineInterval,
    )
    stationingSource.load(loaded.assessment.stationingSource ?? {})
    clearElementHistory()
    appendNotices([
      {
        level: 'success',
        text: 'Project settings loaded. Re-add the H5 files to regenerate the map.',
      },
    ])
  }

  return {
    saveProject: projectFiles.saveProject,
    loadProject,
  }
}
