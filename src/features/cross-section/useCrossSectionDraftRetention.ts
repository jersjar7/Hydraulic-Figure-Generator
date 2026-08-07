import type {
  Dispatch,
  SetStateAction,
} from 'react'
import type { CrossSectionLine } from '../../core/types'
import type { HydraulicProjectWorkspaceValue } from '../project-workspace/hydraulicProjectWorkspaceContext'
import { useWorkspaceDraftRetention } from '../project-workspace/useWorkspaceDraftRetention'
import type { CrossSectionProjectState } from './crossSectionProjectFile'
import type { CrossSectionFigureSettings } from './crossSectionSettings'
import { crossSectionWorkspaceDraft } from './crossSectionWorkspaceDraft'

type Options = {
  settings: CrossSectionFigureSettings
  selectedLine: CrossSectionLine | null
  selectedAssessmentLineId: string
  projectSession: HydraulicProjectWorkspaceValue['projectSession']
  projectDocument: HydraulicProjectWorkspaceValue['projectDocument']
  setSettings: Dispatch<SetStateAction<CrossSectionFigureSettings>>
  loadSelection(line: CrossSectionLine | null, assessmentLineId: string): void
  invalidateFigures(): void
}

export function useCrossSectionDraftRetention({
  settings,
  selectedLine,
  selectedAssessmentLineId,
  projectSession,
  projectDocument,
  setSettings,
  loadSelection,
  invalidateFigures,
}: Options) {
  const snapshot: CrossSectionProjectState = {
    settings,
    selectedLine,
    selectedAssessmentLineId,
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
    project: projectDocument.document,
  }
  const hydrate = (draft: CrossSectionProjectState) => {
    setSettings(draft.settings)
    loadSelection(draft.selectedLine, draft.selectedAssessmentLineId)
    projectSession.loadSelection(draft.scenarioSelection)
    projectDocument.loadDocument(draft.project)
    invalidateFigures()
  }

  const retention = useWorkspaceDraftRetention({
    module: crossSectionWorkspaceDraft,
    snapshot,
    hydrate,
  })

  return { snapshot, hydrate, capture: retention.capture }
}
