import type {
  Dispatch,
  SetStateAction,
} from 'react'
import type { WseDifferenceScene } from '../../core/types'
import type { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import type { HydraulicProjectWorkspaceValue } from '../project-workspace/hydraulicProjectWorkspaceContext'
import { useWorkspaceDraftRetention } from '../project-workspace/useWorkspaceDraftRetention'
import type { useCenterlineStationingSource } from '../stationing/useCenterlineStationingSource'
import type { useWseFigureDocument } from './useWseFigureDocument'
import type { WseProjectState } from './wseProjectDocument'
import { wseWorkspaceDraft } from './wseWorkspaceDraft'

type Options = {
  projectSession: HydraulicProjectWorkspaceValue['projectSession']
  projectDocument: HydraulicProjectWorkspaceValue['projectDocument']
  figureDocument: ReturnType<typeof useWseFigureDocument>
  assessmentWorkflow: ReturnType<typeof useAssessmentWorkflow>
  stationingSource: ReturnType<typeof useCenterlineStationingSource>
  clearElementHistory(): void
  setScene: Dispatch<SetStateAction<WseDifferenceScene | null>>
}

export function useWseDraftRetention({
  projectSession,
  projectDocument,
  figureDocument,
  assessmentWorkflow,
  stationingSource,
  clearElementHistory,
  setScene,
}: Options) {
  const assessment = assessmentWorkflow.state
  const snapshot: WseProjectState = {
    document: figureDocument.document,
    project: projectDocument.document,
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
      centerlineId: assessment.centerlineId,
      direction: assessment.direction,
      startStation: assessment.startStation,
      stationingSource: stationingSource.state,
      overrides: assessment.overrides,
    },
  }

  const retention = useWorkspaceDraftRetention({
    module: wseWorkspaceDraft,
    snapshot,
    hydrate: (draft) => {
      figureDocument.loadDocument(draft.document)
      projectDocument.loadDocument(draft.project)
      projectSession.loadSelection(draft.scenarioSelection)
      assessmentWorkflow.load(
        draft.assessment,
        draft.document.settings.assessmentLineInterval,
      )
      stationingSource.load(draft.assessment.stationingSource ?? {})
      clearElementHistory()
      setScene(null)
    },
  })

  return { snapshot, capture: retention.capture }
}
