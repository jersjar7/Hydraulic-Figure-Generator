import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { PlanViewFigureSetCatalog } from '../src/features/plan-view-results/planViewFigureSet'
import {
  createPlanViewFigureSetDocument,
  expandPlanViewFigureSet,
} from '../src/features/plan-view-results/planViewFigureSet'
import { createDefaultPlanViewResultSettings } from '../src/features/plan-view-results/planViewResultSettings'
import { createDefaultFigureDocumentSettings } from '../src/core/types'
import {
  buildPlanViewFigureDocumentPages,
  figureDocumentFileName,
  movePlanViewFigureSetItem,
} from '../src/features/plan-view-results/planViewFigureDocument'

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

  it('assembles included pages in order and supports report ordering', () => {
    const items = expandPlanViewFigureSet(
      catalog,
      {
        scenarioIds: ['EX'],
        runIndicesByScenario: { EX: [0, 1] },
        resultParametersByScenario: { EX: ['Water_Depth_ft'] },
      },
      createDefaultPlanViewResultSettings(),
    )
    items[1] = { ...items[1], caption: 'One-hundred-year depth.' }
    const set = createPlanViewFigureSetDocument(items)
    const moved = movePlanViewFigureSetItem(set, items[1].id, -1)
    const pages = buildPlanViewFigureDocumentPages(
      moved,
      { [items[1].id]: { status: 'ready', thumbnailUrl: 'preview' } },
      { ...createDefaultFigureDocumentSettings(), startingFigureNumber: 9 },
    )

    assert.deepEqual(pages.map((page) => page.id), [items[1].id, items[0].id])
    assert.deepEqual(pages.map((page) => page.figureNumber), [9, 10])
    assert.equal(pages[0].thumbnailUrl, 'preview')
    assert.equal(pages[0].caption, 'One-hundred-year depth.')
    assert.equal(figureDocumentFileName(' Site 6 / Results '), 'Site_6_Results.docx')
  })
})
