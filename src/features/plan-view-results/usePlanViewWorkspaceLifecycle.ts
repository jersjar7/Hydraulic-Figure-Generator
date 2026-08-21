import type {
  Dispatch,
  RefObject,
  SetStateAction,
} from 'react'
import type {
  IngestNotice,
  MapElementBounds,
  PlanViewResultScene,
  PlanViewResultSettings,
} from '../../core/types'
import type { useMapElementController } from '../figures/useMapElementController'
import { createHydraulicProjectInputActions } from '../project-workspace/hydraulicProjectInputActions'
import type { HydraulicProjectWorkspaceValue } from '../project-workspace/hydraulicProjectWorkspaceContext'
import type { useCenterlineStationingSource } from '../stationing/useCenterlineStationingSource'
import type { usePlanViewAnnotations } from './usePlanViewAnnotations'
import type { usePlanViewFigureDocument } from './usePlanViewFigureDocument'
import type { usePlanViewFigureSet } from './usePlanViewFigureSet'
import type { usePlanViewSingleFigure } from './usePlanViewSingleFigure'
import type { usePlanViewStationing } from './usePlanViewStationing'
import { usePlanViewWorkspacePersistence } from './usePlanViewWorkspacePersistence'
import type { usePlanViewWorkspaceUi } from './usePlanViewWorkspaceUi'

type Options = {
  projectSession: HydraulicProjectWorkspaceValue['projectSession']
  projectDocument: HydraulicProjectWorkspaceValue['projectDocument']
  settings: PlanViewResultSettings
  setSettings: Dispatch<SetStateAction<PlanViewResultSettings>>
  setScene: Dispatch<SetStateAction<PlanViewResultScene | null>>
  figureSet: ReturnType<typeof usePlanViewFigureSet>
  figureDocument: ReturnType<typeof usePlanViewFigureDocument>
  stationingSource: ReturnType<typeof useCenterlineStationingSource>
  stationing: ReturnType<typeof usePlanViewStationing>
  annotations: ReturnType<typeof usePlanViewAnnotations>
  elements: ReturnType<typeof useMapElementController<PlanViewResultSettings>>
  singleFigure: ReturnType<typeof usePlanViewSingleFigure>
  ui: ReturnType<typeof usePlanViewWorkspaceUi>
  elementBoundsRef: RefObject<MapElementBounds[]>
  resetMapInteractions(): void
  appendNotices(notices: IngestNotice[]): void
}

export function usePlanViewWorkspaceLifecycle(options: Options) {
  const { draftRetention } = usePlanViewWorkspacePersistence({
    settings: options.settings,
    setSettings: options.setSettings,
    scenarios: options.projectSession.scenarios,
    projectSession: options.projectSession,
    projectDocument: options.projectDocument,
    figureSet: options.figureSet,
    figureDocument: options.figureDocument,
    stationingSource: options.stationingSource,
    stationing: options.stationing,
    annotations: options.annotations,
    elements: options.elements,
    setScene: options.setScene,
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
    onFilesChanged: options.singleFigure.invalidate,
    onSelectionChanged: options.singleFigure.invalidate,
    onAssessmentSourceChanged: () => undefined,
    setBusy: options.ui.setBusy,
    appendNotices: options.appendNotices,
  })

  const resetProject = () => {
    options.resetMapInteractions()
    options.projectSession.reset()
    options.projectDocument.resetDocument()
    options.stationingSource.reset()
    options.stationing.clearSelection()
    options.annotations.reset()
    options.elements.clearHistory()
    options.elementBoundsRef.current = []
    options.singleFigure.reset()
    options.figureSet.reset()
    options.figureDocument.reset()
    options.ui.resetForProject()
  }

  return { draftRetention, projectInputs, resetProject }
}
