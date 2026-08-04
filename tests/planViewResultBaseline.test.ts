import assert from 'node:assert/strict'
import { createCanvas } from '@napi-rs/canvas'
import { describe, it } from 'node:test'
import { FRAMES } from '../src/core/mapRenderer'
import { renderPlanViewResultDocument } from '../src/core/map/planViewResultRenderer'
import type { PlanViewResultScene } from '../src/core/types'
import { createDefaultPlanViewResultSettings } from '../src/features/plan-view-results/planViewResultSettings'
import {
  syntheticGeometry,
  syntheticRunSelection,
} from './fixtures/syntheticHydraulics'

function scene(): PlanViewResultScene {
  const projected = syntheticGeometry()
  const selection = syntheticRunSelection(
    'EX',
    'Existing',
    'Existing 100YR',
    projected,
  )
  selection.run.params.Water_Depth_ft = {
    shape: [1, 4],
    vector: false,
  }
  return {
    selection,
    projected,
    result: {
      paramName: 'Water_Depth_ft',
      label: 'Water Depth',
      units: 'ft',
      defaultRamp: 'depth',
    },
    values: new Float32Array([0.5, 2, 3.5, 5]),
    validMin: 0.5,
    validMax: 5,
    autoMin: 0,
    autoMax: 5,
    autoInterval: 0.5,
    validNodes: 4,
  }
}

describe('Plan-View Hydraulic Results production baseline', () => {
  it('keeps scalar result and contour defaults explicit', () => {
    const settings = createDefaultPlanViewResultSettings()
    assert.equal(settings.resultParameter, 'Water_Depth_ft')
    assert.equal(settings.ramp, 'depth')
    assert.equal(settings.legendMin, null)
    assert.equal(settings.legendMax, null)
    assert.equal(settings.showContours, true)
    assert.equal(settings.contourColor, '#111827')
  })

  it('renders classified values, contours, and report elements in both frames', async () => {
    for (const orientation of ['landscape', 'portrait'] as const) {
      const settings = {
        ...createDefaultPlanViewResultSettings(),
        orientation,
        basemapOpacity: 0,
        showOverlays: false,
      }
      const frame = FRAMES[orientation]
      const canvas = createCanvas(frame.width, frame.height)
      const elements = await renderPlanViewResultDocument(
        canvas as unknown as HTMLCanvasElement,
        {
          scene: scene(),
          view: {
            bounds: { x0: -8, x1: 108, y0: -8, y1: 108 },
            settings,
          },
          layers: { overlays: [] },
          selection: {},
        },
      )
      assert.deepEqual(
        elements.map((element) => element.key),
        ['title', 'diffLegend', 'north', 'scale'],
      )
      assert.ok(
        elements.every(
          (element) =>
            element.x >= 0 &&
            element.y >= 0 &&
            element.x + element.width <= frame.width &&
            element.y + element.height <= frame.height,
        ),
      )
      const pixels = canvas
        .getContext('2d')
        .getImageData(0, 0, frame.width, frame.height).data
      let colored = 0
      let dark = 0
      for (let index = 0; index < pixels.length; index += 64) {
        const red = pixels[index]
        const green = pixels[index + 1]
        const blue = pixels[index + 2]
        if (Math.max(red, green, blue) - Math.min(red, green, blue) > 20) {
          colored += 1
        }
        if (red + green + blue < 300) dark += 1
      }
      assert.ok(colored > 2_000)
      assert.ok(dark > 100)
    }
  })
})
