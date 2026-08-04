import assert from 'node:assert/strict'
import { createCanvas } from '@napi-rs/canvas'
import { describe, it } from 'node:test'
import {
  PLAN_VIEW_MESH_ELEMENTS_ID,
  PLAN_VIEW_TOPOGRAPHY_ID,
  PLAN_VIEW_TOPOGRAPHY_MESH_ID,
} from '../src/core/types'
import {
  buildPlanViewGeometryScene,
  planViewGeometryOutputOptions,
} from '../src/core/hydraulics/planViewGeometryResults'
import { renderPlanViewResultDocument } from '../src/core/map/planViewResultRenderer'
import { FRAMES } from '../src/core/mapRenderer'
import { createDefaultPlanViewResultSettings } from '../src/features/plan-view-results/planViewResultSettings'
import { syntheticRunSelection } from './fixtures/syntheticHydraulics'

function condition() {
  const projected = syntheticRunSelection(
    'EX',
    'Existing',
    'Existing 100YR',
    {
      meshName: 'Synthetic terrain',
      N: 4,
      xy: new Float64Array([0, 0, 100, 0, 0, 100, 100, 100]),
      z: new Float32Array([40, 42, 44, 46]),
      tris: new Uint32Array([0, 1, 2, 1, 3, 2]),
      wkt: null,
      lon: new Float64Array(4),
      lat: new Float64Array(4),
      mx: new Float64Array([0, 100, 0, 100]),
      my: new Float64Array([0, 0, 100, 100]),
      bbox: { x0: 0, x1: 100, y0: 0, y1: 100 },
      xyBbox: { x0: 0, x1: 100, y0: 0, y1: 100 },
      ftPerMerc: 1,
    },
  ).condition
  return projected
}

describe('Plan-View geometry outputs', () => {
  it('publishes the three run-independent geometry choices', () => {
    assert.deepEqual(
      planViewGeometryOutputOptions(condition()).map((option) => [
        option.paramName,
        option.runDependent,
      ]),
      [
        [PLAN_VIEW_TOPOGRAPHY_ID, false],
        [PLAN_VIEW_MESH_ELEMENTS_ID, false],
        [PLAN_VIEW_TOPOGRAPHY_MESH_ID, false],
      ],
    )
  })

  it('builds each scene directly from geometry elevations and connectivity', () => {
    const source = condition()
    for (const outputId of [
      PLAN_VIEW_TOPOGRAPHY_ID,
      PLAN_VIEW_MESH_ELEMENTS_ID,
      PLAN_VIEW_TOPOGRAPHY_MESH_ID,
    ] as const) {
      const scene = buildPlanViewGeometryScene(source, outputId)
      assert.equal(scene.condition, source)
      assert.equal(scene.selection, null)
      assert.equal(scene.values, source.projected!.z)
      assert.equal(scene.validNodes, 4)
    }
  })

  it('renders mesh-only without a scalar legend and combined with one', async () => {
    const source = condition()
    const settings = {
      ...createDefaultPlanViewResultSettings(),
      basemapOpacity: 0,
      showOverlays: false,
      showContours: false,
    }
    for (const [outputId, expectedElements] of [
      [PLAN_VIEW_MESH_ELEMENTS_ID, ['title', 'north', 'scale']],
      [
        PLAN_VIEW_TOPOGRAPHY_MESH_ID,
        ['title', 'diffLegend', 'north', 'scale'],
      ],
    ] as const) {
      const frame = FRAMES.landscape
      const canvas = createCanvas(frame.width, frame.height)
      const elements = await renderPlanViewResultDocument(
        canvas as unknown as HTMLCanvasElement,
        {
          scene: buildPlanViewGeometryScene(source, outputId),
          view: {
            bounds: { x0: -8, x1: 108, y0: -8, y1: 108 },
            settings,
          },
          layers: { overlays: [] },
          selection: {},
        },
      )
      assert.deepEqual(elements.map((element) => element.key), expectedElements)
    }
  })
})
