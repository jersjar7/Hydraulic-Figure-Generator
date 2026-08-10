import assert from 'node:assert/strict'
import { createCanvas } from '@napi-rs/canvas'
import { describe, it } from 'node:test'
import { FRAMES } from '../src/core/mapRenderer'
import { renderPlanViewResultDocument } from '../src/core/map/planViewResultRenderer'
import type { PlanViewResultScene } from '../src/core/types'
import { generateCenterlineStationTicks } from '../src/core/centerlineStationing'
import { createDefaultPlanViewResultSettings } from '../src/features/plan-view-results/planViewResultSettings'
import { createPlanViewResultRenderDocument } from '../src/features/plan-view-results/planViewResultRenderDocument'
import type { HydraulicEngine } from '../src/core/hydraulicEngine'
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
    condition: selection.condition,
    selection,
    outputKind: 'scalar',
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
  it('uses one render document policy for editor and published outputs', () => {
    const bounds = { x0: -8, x1: 108, y0: -8, y1: 108 }
    const engine = {
      commonBounds: () => bounds,
    } as unknown as HydraulicEngine
    const centerlineStationing = {
      centerline: {
        id: 'centerline',
        overlayId: 'overlay',
        overlayName: 'Centerline',
        featureIndex: 0,
        partIndex: 0,
        mapPoints: [{ x: 10, y: 50 }, { x: 90, y: 50 }],
        modelPoints: [{ x: 10, y: 50 }, { x: 90, y: 50 }],
        lengthFeet: 80,
      },
      direction: 'a-to-b' as const,
      ticks: [],
      selectedLabelId: 'station-40',
    }
    const editor = createPlanViewResultRenderDocument({
      engine,
      scene: scene(),
      settings: createDefaultPlanViewResultSettings(),
      overlays: [],
      centerlineStationing: [centerlineStationing],
    })
    const published = createPlanViewResultRenderDocument({
      engine,
      scene: scene(),
      settings: createDefaultPlanViewResultSettings(),
      overlays: [],
      centerlineStationing: [centerlineStationing],
      mode: 'published',
    })

    assert.equal(editor.view.bounds, bounds)
    assert.equal(
      editor.layers.centerlineStationing[0]?.selectedLabelId,
      'station-40',
    )
    assert.equal(published.layers.centerlineStationing[0]?.selectedLabelId, null)
  })

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

  it('renders configured centerline station ticks above the hydraulic result', async () => {
    const settings = createDefaultPlanViewResultSettings()
    settings.basemapOpacity = 0
    settings.showTitle = false
    settings.showLegend = false
    settings.showNorth = false
    settings.showScale = false
    settings.centerlineStationing.visible = true
    settings.centerlineStationing.showLabels = false
    settings.centerlineStationing.tickColor = '#ff00ff'
    settings.centerlineStationing.minorInterval = 20
    settings.centerlineStationing.majorInterval = 40
    const centerline = {
      id: 'centerline',
      overlayId: 'overlay',
      overlayName: 'Centerline',
      featureIndex: 0,
      partIndex: 0,
      mapPoints: [{ x: 10, y: 50 }, { x: 90, y: 50 }],
      modelPoints: [{ x: 10, y: 50 }, { x: 90, y: 50 }],
      lengthFeet: 80,
    }
    const canvas = createCanvas(1650, 1275)
    await renderPlanViewResultDocument(
      canvas as unknown as HTMLCanvasElement,
      {
        scene: scene(),
        view: {
          bounds: { x0: -8, x1: 108, y0: -8, y1: 108 },
          settings,
        },
        layers: {
          overlays: [],
          centerlineStationing: [{
            centerline,
            direction: 'a-to-b',
            ticks: generateCenterlineStationTicks(
              centerline,
              'a-to-b',
              0,
              settings.centerlineStationing,
            ),
          }],
        },
        selection: {},
      },
    )
    const pixels = canvas
      .getContext('2d')
      .getImageData(0, 0, canvas.width, canvas.height).data
    let magenta = 0
    for (let index = 0; index < pixels.length; index += 4) {
      if (
        pixels[index] > 220 &&
        pixels[index + 1] < 45 &&
        pixels[index + 2] > 220
      ) {
        magenta += 1
      }
    }
    assert.ok(magenta > 20)
  })

  it('renders a moved station label with its configured anchored leader', async () => {
    const settings = createDefaultPlanViewResultSettings()
    settings.basemapOpacity = 0
    settings.showTitle = false
    settings.showLegend = false
    settings.showNorth = false
    settings.showScale = false
    settings.centerlineStationing.visible = true
    settings.centerlineStationing.showMinorTicks = false
    settings.centerlineStationing.showMajorTicks = false
    settings.centerlineStationing.labelInterval = 40
    const centerline = {
      id: 'centerline',
      overlayId: 'overlay',
      overlayName: 'Centerline',
      featureIndex: 0,
      partIndex: 0,
      mapPoints: [{ x: 10, y: 50 }, { x: 90, y: 50 }],
      modelPoints: [{ x: 10, y: 50 }, { x: 90, y: 50 }],
      lengthFeet: 80,
    }
    const ticks = generateCenterlineStationTicks(
      centerline,
      'a-to-b',
      0,
      settings.centerlineStationing,
    )
    const labelId = ticks.find((tick) => tick.label)!.id
    settings.centerlineStationing.overrides[labelId] = {
      framePoint: { x: 0.7, y: 0.25 },
      leaderColor: '#00ff00',
      leaderWidth: 4,
      leaderAttachment: 'auto',
    }
    const canvas = createCanvas(1650, 1275)
    await renderPlanViewResultDocument(
      canvas as unknown as HTMLCanvasElement,
      {
        scene: scene(),
        view: {
          bounds: { x0: -8, x1: 108, y0: -8, y1: 108 },
          settings,
        },
        layers: {
          overlays: [],
          centerlineStationing: [{
            centerline,
            direction: 'a-to-b',
            ticks,
          }],
        },
        selection: {},
      },
    )
    const pixels = canvas
      .getContext('2d')
      .getImageData(0, 0, canvas.width, canvas.height).data
    let green = 0
    for (let index = 0; index < pixels.length; index += 4) {
      if (
        pixels[index] < 60 &&
        pixels[index + 1] > 200 &&
        pixels[index + 2] < 60
      ) {
        green += 1
      }
    }
    assert.ok(green > 100)
  })
})
