import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parsePlanViewResultProject,
  serializePlanViewResultProject,
} from '../src/features/plan-view-results/planViewResultProjectFile'
import { createDefaultPlanViewResultSettings } from '../src/features/plan-view-results/planViewResultSettings'
import { createPlanViewFigureSetDocument } from '../src/features/plan-view-results/planViewFigureSet'
import { createDefaultFigureDocumentSettings } from '../src/core/types'
import { PLAN_VIEW_TOPOGRAPHY_ID } from '../src/core/types'

describe('plan-view result project files', () => {
  it('round-trips settings, scenario selection, and shared overlays', () => {
    const state = {
      settings: {
        ...createDefaultPlanViewResultSettings(),
        resultParameter: 'Froude',
        ramp: 'froude' as const,
        legendMax: 2,
      },
      scenarioSelection: {
        baselineId: 'NA',
        comparisonId: 'PR',
        assessmentId: 'NA',
        runByScenario: { NA: 1 },
      },
      project: { overlays: [] },
      figureSet: createPlanViewFigureSetDocument(),
      figureDocument: {
        ...createDefaultFigureDocumentSettings(),
        startingFigureNumber: 12,
      },
    }
    assert.deepEqual(
      parsePlanViewResultProject(serializePlanViewResultProject(state)),
      state,
    )
  })

  it('migrates version 1 projects to an empty figure set and document defaults', () => {
    const legacy = JSON.stringify({
      version: 1,
      figureId: 'plan-view-hydraulic-results',
      settings: createDefaultPlanViewResultSettings(),
      scenarioSelection: {
        baselineId: 'EX',
        comparisonId: 'PR',
        assessmentId: 'EX',
        runByScenario: {},
      },
      project: { overlays: [] },
    })
    assert.deepEqual(
      parsePlanViewResultProject(legacy).figureSet,
      createPlanViewFigureSetDocument(),
    )
    assert.deepEqual(
      parsePlanViewResultProject(legacy).figureDocument,
      createDefaultFigureDocumentSettings(),
    )
  })

  it('migrates version 2 figure sets to document defaults', () => {
    const version2 = JSON.stringify({
      version: 2,
      figureId: 'plan-view-hydraulic-results',
      settings: createDefaultPlanViewResultSettings(),
      scenarioSelection: {
        baselineId: 'EX',
        comparisonId: 'PR',
        assessmentId: 'EX',
        runByScenario: {},
      },
      project: { overlays: [] },
      figureSet: createPlanViewFigureSetDocument(),
    })
    assert.deepEqual(
      parsePlanViewResultProject(version2).figureDocument,
      createDefaultFigureDocumentSettings(),
    )
  })

  it('hydrates legacy scalar selections and current geometry selections', () => {
    const settings = createDefaultPlanViewResultSettings()
    const base = {
      figureId: 'plan-view-hydraulic-results',
      settings,
      scenarioSelection: {
        baselineId: 'EX',
        comparisonId: 'PR',
        assessmentId: 'EX',
        runByScenario: { EX: 0 },
      },
      project: { overlays: [] },
    }
    const scalar = parsePlanViewResultProject(JSON.stringify({
      ...base,
      version: 3,
      figureSet: {
        id: 'set',
        name: 'Legacy',
        items: [{
          id: 'legacy-scalar',
          recipeId: 'plan-view-scalar-results',
          figureId: 'plan-view-hydraulic-results',
          title: 'Depth',
          caption: 'Depth',
          included: true,
          selection: {
            scenarioId: 'EX',
            runIndex: 0,
            resultParameter: 'Water_Depth_ft',
          },
          settings,
        }],
      },
    }))
    assert.equal(scalar.figureSet!.items[0].selection.kind, 'scalar')

    const geometry = parsePlanViewResultProject(JSON.stringify({
      ...base,
      version: 4,
      figureSet: {
        id: 'set',
        name: 'Geometry',
        items: [{
          id: 'geometry',
          recipeId: 'plan-view-scalar-results',
          figureId: 'plan-view-hydraulic-results',
          title: 'Topography',
          caption: 'Topography',
          included: true,
          selection: {
            kind: 'geometry',
            scenarioId: 'EX',
            resultParameter: PLAN_VIEW_TOPOGRAPHY_ID,
          },
          settings: { ...settings, resultParameter: PLAN_VIEW_TOPOGRAPHY_ID },
        }],
      },
    }))
    assert.equal(geometry.figureSet!.items[0].selection.kind, 'geometry')
  })

  it('rejects another figure and unsafe settings', () => {
    assert.throws(
      () => parsePlanViewResultProject(JSON.stringify({ figureId: 'other' })),
      /not a Plan-View/,
    )
    const text = serializePlanViewResultProject({
      settings: {
        ...createDefaultPlanViewResultSettings(),
        zoom: 0,
      },
      scenarioSelection: {
        baselineId: 'EX',
        comparisonId: 'PR',
        assessmentId: 'EX',
        runByScenario: {},
      },
      project: { overlays: [] },
    })
    assert.throws(() => parsePlanViewResultProject(text), /invalid values/)
  })
})
