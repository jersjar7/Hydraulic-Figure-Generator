import type {
  ChangeEvent,
  Dispatch,
  SetStateAction,
} from 'react'
import type { IngestNotice, WseDifferenceScene } from '../../core/types'
import type { HydraulicProjectWorkspaceValue } from '../project-workspace/hydraulicProjectWorkspaceContext'
import type { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import type { useWseEditorUi } from './useWseEditorUi'
import type { useWseFigureDocument } from './useWseFigureDocument'
import { createWseProjectFileActions } from './wseProjectFileActions'

type Options = {
  projectSession: HydraulicProjectWorkspaceValue['projectSession']
  projectDocument: HydraulicProjectWorkspaceValue['projectDocument']
  figureDocument: ReturnType<typeof useWseFigureDocument>
  assessmentWorkflow: ReturnType<typeof useAssessmentWorkflow>
  editorUi: ReturnType<typeof useWseEditorUi>
  setScene: Dispatch<SetStateAction<WseDifferenceScene | null>>
  appendNotices(notices: IngestNotice[]): void
}

export function createWseProjectPersistenceController({
  projectSession,
  projectDocument,
  figureDocument,
  assessmentWorkflow,
  editorUi,
  setScene,
  appendNotices,
}: Options) {
  const state = assessmentWorkflow.state
  const projectFiles = createWseProjectFileActions({
    snapshot: {
      settings: figureDocument.settings,
      overlays: projectDocument.overlays,
      annotations: figureDocument.annotations,
      annotationDefaults: figureDocument.annotationDefaults,
      scenarioSelection: {
        baselineId: projectSession.baselineId,
        comparisonId: projectSession.comparisonId,
        assessmentId: projectSession.assessmentId,
        runByScenario: projectSession.runByScenario,
        labels: Object.fromEntries(
          projectSession.scenarios.map((scenario) => [
            scenario.key,
            scenario.label,
          ]),
        ),
      },
      assessment: {
        centerlineId: state.centerlineId,
        direction: state.direction,
        startStation: state.startStation,
        overrides: state.overrides,
      },
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
