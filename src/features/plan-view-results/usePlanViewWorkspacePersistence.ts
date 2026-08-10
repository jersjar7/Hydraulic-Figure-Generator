import type {
  ChangeEvent,
  Dispatch,
  SetStateAction,
} from 'react'
import type {
  IngestNotice,
  PlanViewResultScene,
  PlanViewResultSettings,
} from '../../core/types'
import type { usePlanViewAnnotations } from './usePlanViewAnnotations'
import type { usePlanViewFigureDocument } from './usePlanViewFigureDocument'
import type { usePlanViewFigureSet } from './usePlanViewFigureSet'
import type { usePlanViewStationing } from './usePlanViewStationing'
import type { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import { useWorkspaceDraftRetention } from '../project-workspace/useWorkspaceDraftRetention'
import type { useCenterlineStationingSource } from '../stationing/useCenterlineStationingSource'
import { usePlanViewResultProjectFiles } from './usePlanViewResultProjectFiles'
import { planViewResultWorkspaceDraft } from './planViewResultWorkspaceDraft'

type Options = {
  settings: PlanViewResultSettings
  setSettings: Dispatch<SetStateAction<PlanViewResultSettings>>
  scenarios: ReturnType<typeof useHydraulicProjectWorkspace>['projectSession']['scenarios']
  projectSession: ReturnType<typeof useHydraulicProjectWorkspace>['projectSession']
  projectDocument: ReturnType<typeof useHydraulicProjectWorkspace>['projectDocument']
  figureSet: ReturnType<typeof usePlanViewFigureSet>
  figureDocument: ReturnType<typeof usePlanViewFigureDocument>
  stationingSource: ReturnType<typeof useCenterlineStationingSource>
  stationing: ReturnType<typeof usePlanViewStationing>
  annotations: ReturnType<typeof usePlanViewAnnotations>
  setScene: Dispatch<SetStateAction<PlanViewResultScene | null>>
  appendNotices(notices: IngestNotice[]): void
}

export function usePlanViewWorkspacePersistence(options: Options) {
  const snapshot = {
    settings: options.settings,
    scenarioSelection: {
      baselineId: options.projectSession.baselineId,
      comparisonId: options.projectSession.comparisonId,
      assessmentId: options.projectSession.assessmentId,
      runByScenario: options.projectSession.runByScenario,
      labels: Object.fromEntries(
        options.scenarios.map((scenario) => [scenario.key, scenario.label]),
      ),
    },
    project: options.projectDocument.document,
    figureSet: options.figureSet.figureSet,
    figureDocument: options.figureDocument.settings,
    stationingSource: { ...options.stationingSource.state },
    annotations: options.annotations.annotations,
    annotationDefaults: options.annotations.annotationDefaults,
  }
  const hydrateDraft = (
    loaded: ReturnType<typeof planViewResultWorkspaceDraft.parseDraft>,
  ) => {
    options.setSettings(loaded.settings)
    options.projectDocument.loadDocument(loaded.project)
    options.projectSession.loadSelection(loaded.scenarioSelection)
    options.figureSet.load(loaded.figureSet ?? options.figureSet.figureSet)
    options.figureDocument.load(loaded.figureDocument)
    options.stationingSource.load(loaded.stationingSource ?? {})
    options.annotations.load(loaded)
    options.stationing.clearSelection()
    options.setScene(null)
  }
  const draftRetention = useWorkspaceDraftRetention({
    module: planViewResultWorkspaceDraft,
    snapshot,
    hydrate: hydrateDraft,
  })
  const projectFiles = usePlanViewResultProjectFiles({
    snapshot,
    appendNotices: options.appendNotices,
  })
  const loadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    const loaded = await projectFiles.loadProjectFile(file)
    if (!loaded) return
    hydrateDraft(loaded)
    options.appendNotices([{
      level: 'success',
      text: 'Plan-view project loaded. Re-add the referenced local H5 files.',
    }])
  }

  return { draftRetention, projectFiles, loadProject }
}
