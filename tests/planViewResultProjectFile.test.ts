import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parsePlanViewResultProject,
  serializePlanViewResultProject,
} from '../src/features/plan-view-results/planViewResultProjectFile'
import { createDefaultPlanViewResultSettings } from '../src/features/plan-view-results/planViewResultSettings'
import { createPlanViewFigureSetDocument } from '../src/features/plan-view-results/planViewFigureSet'

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
    }
    assert.deepEqual(
      parsePlanViewResultProject(serializePlanViewResultProject(state)),
      state,
    )
  })

  it('migrates version 1 projects to an empty figure set', () => {
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
