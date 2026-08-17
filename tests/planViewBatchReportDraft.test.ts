import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultAnnotationSettings } from '../src/core/defaults'
import { createDefaultFigureDocumentSettings } from '../src/core/types'
import { createHydraulicProjectDocument } from '../src/features/project-document/hydraulicProjectDocument'
import { createPlanViewBatchReportDraft } from '../src/features/plan-view-results/planViewBatchReportDraft'
import {
  createPlanViewFigureSetDocument,
  type PlanViewFigureSetItem,
} from '../src/features/plan-view-results/planViewFigureSet'
import { createDefaultPlanViewResultSettings } from '../src/features/plan-view-results/planViewResultSettings'
import { planViewResultWorkspaceDraft } from '../src/features/plan-view-results/planViewResultWorkspaceDraft'

test('batch report drafts reopen the selected scenario, run, result, and settings', () => {
  const settings = {
    ...createDefaultPlanViewResultSettings(),
    resultParameter: 'Water_Elev_ft',
    figureTitle: 'Proposed 500-year WSE',
  }
  const item: PlanViewFigureSetItem = {
    id: 'proposed-500-wse',
    recipeId: 'plan-view-scalar-results',
    figureId: 'plan-view-hydraulic-results',
    title: 'Proposed - 500-year - Water Surface Elevation',
    caption: 'Proposed 500-year WSE.',
    included: true,
    selection: {
      kind: 'scalar',
      scenarioId: 'PR',
      runIndex: 3,
      resultParameter: 'Water_Elev_ft',
    },
    settings,
  }
  const figureSet = createPlanViewFigureSetDocument([item])
  const snapshot = createPlanViewBatchReportDraft({
    settings: createDefaultPlanViewResultSettings(),
    scenarioSelection: {
      baselineId: 'EX',
      comparisonId: 'PR',
      assessmentId: 'EX',
      runByScenario: { EX: 0, PR: 0 },
      labels: { EX: 'Existing', PR: 'Proposed' },
    },
    project: createHydraulicProjectDocument(),
    figureSet,
    figureDocument: createDefaultFigureDocumentSettings(),
    stationingSource: { centerlines: [] },
    annotations: [],
    annotationDefaults: createDefaultAnnotationSettings(),
  }, item)

  assert.equal(snapshot.workspaceId, 'plan-view-hydraulic-results')
  const restored = planViewResultWorkspaceDraft.parseDraft(snapshot.source)
  assert.equal(restored.scenarioSelection.baselineId, 'PR')
  assert.equal(restored.scenarioSelection.runByScenario.PR, 3)
  assert.equal(restored.settings.resultParameter, 'Water_Elev_ft')
  assert.equal(restored.settings.figureTitle, 'Proposed 500-year WSE')
})
