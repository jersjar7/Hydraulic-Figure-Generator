import { useCallback } from 'react'
import type { IngestNotice } from '../../core/types'
import type { HydraulicProjectWorkspaceValue } from '../project-workspace/hydraulicProjectWorkspaceContext'
import type { CenterlineStationingSource } from '../stationing/centerlineStationingSource'
import type { useCenterlineStationingSource } from '../stationing/useCenterlineStationingSource'
import { createPlanViewBatchReportDraft } from './planViewBatchReportDraft'
import type { usePlanViewAnnotations } from './usePlanViewAnnotations'
import { usePlanViewBatchReportExport } from './usePlanViewBatchReportExport'
import type { usePlanViewFigureDocument } from './usePlanViewFigureDocument'
import type { usePlanViewFigureSet } from './usePlanViewFigureSet'

type Options = {
  projectSession: HydraulicProjectWorkspaceValue['projectSession']
  projectDocument: HydraulicProjectWorkspaceValue['projectDocument']
  reportAssembly: HydraulicProjectWorkspaceValue['reportAssembly']
  figureSet: ReturnType<typeof usePlanViewFigureSet>
  figureDocument: ReturnType<typeof usePlanViewFigureDocument>
  stationingSource: ReturnType<typeof useCenterlineStationingSource>
  renderStationingSource?: CenterlineStationingSource
  annotations: ReturnType<typeof usePlanViewAnnotations>
  appendNotices(notices: IngestNotice[]): void
}

export function usePlanViewBatchProduction({
  projectSession,
  projectDocument,
  reportAssembly,
  figureSet,
  figureDocument,
  stationingSource,
  renderStationingSource,
  annotations,
  appendNotices,
}: Options) {
  const createDraft = useCallback(
    (item: Parameters<typeof createPlanViewBatchReportDraft>[1]) =>
      createPlanViewBatchReportDraft({
        settings: item.settings,
        scenarioSelection: {
          baselineId: projectSession.baselineId,
          comparisonId: projectSession.comparisonId,
          assessmentId: projectSession.assessmentId,
          runByScenario: projectSession.runByScenario,
          labels: Object.fromEntries(
            projectSession.scenarios.map((scenario) => [scenario.key, scenario.label]),
          ),
          crsOverrides: projectSession.crsOverrides,
        },
        project: projectDocument.document,
        figureSet: figureSet.figureSet,
        figureDocument: figureDocument.settings,
        stationingSource: { ...stationingSource.state },
        annotations: annotations.annotations,
        annotationDefaults: annotations.annotationDefaults,
      }, item),
    [
      annotations.annotationDefaults,
      annotations.annotations,
      figureDocument.settings,
      figureSet.figureSet,
      projectDocument.document,
      projectSession,
      stationingSource.state,
    ],
  )

  return usePlanViewBatchReportExport({
    engine: projectSession.engine,
    overlays: projectDocument.overlays,
    stationingSource: renderStationingSource,
    figureSet,
    addFigure: reportAssembly.addFigure,
    createDraft,
    appendNotices,
  })
}
