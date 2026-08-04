import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parsePlanViewResultProject,
  serializePlanViewResultProject,
} from '../src/features/plan-view-results/planViewResultProjectFile'
import { createDefaultPlanViewResultSettings } from '../src/features/plan-view-results/planViewResultSettings'

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
    }
    assert.deepEqual(
      parsePlanViewResultProject(serializePlanViewResultProject(state)),
      state,
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
