import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { PlanViewFigureSetCatalog } from '../src/features/plan-view-results/planViewFigureSet'
import {
  createPlanViewFigureSetDocument,
  expandPlanViewFigureSet,
} from '../src/features/plan-view-results/planViewFigureSet'
import { createDefaultPlanViewResultSettings } from '../src/features/plan-view-results/planViewResultSettings'

const catalog = {
  condition: (key: string) => ({ key, label: key === 'EX' ? 'Existing' : key }),
  runOptions: (key: string) => key === 'EX'
    ? [
        { run: { name: 'Existing_2YR' } },
        { run: { name: 'Existing_100YR' } },
      ]
    : [],
  scalarResultOptions: (_key: string, runIndex: number) => [
    {
      paramName: 'Water_Depth_ft',
      label: 'Water Depth',
      units: 'ft',
      defaultRamp: 'depth' as const,
      shape: [3],
    },
    ...(runIndex === 1
      ? [{
          paramName: 'Froude',
          label: 'Froude Number',
          units: '',
          defaultRamp: 'froude' as const,
          shape: [3],
        }]
      : []),
  ],
} as unknown as PlanViewFigureSetCatalog

describe('Plan-View figure set recipe', () => {
  it('expands only valid scenario, run, and result combinations', () => {
    const items = expandPlanViewFigureSet(
      catalog,
      {
        scenarioIds: ['EX'],
        runIndicesByScenario: { EX: [0, 1] },
        resultParametersByScenario: {
          EX: ['Water_Depth_ft', 'Froude'],
        },
      },
      createDefaultPlanViewResultSettings(),
    )

    assert.equal(items.length, 3)
    assert.deepEqual(
      items.map((item) => item.title),
      [
        'Existing - Existing 2YR - Water Depth',
        'Existing - Existing 100YR - Water Depth',
        'Existing - Existing 100YR - Froude Number',
      ],
    )
    assert.equal(items[2].settings.ramp, 'froude')
    assert.equal(items[2].settings.elementStyles.diffLegend.units, '')
  })

  it('creates an empty portable document without runtime previews', () => {
    assert.deepEqual(createPlanViewFigureSetDocument(), {
      id: 'plan-view-results-set',
      name: 'Plan-View Hydraulic Results',
      items: [],
    })
  })
})
