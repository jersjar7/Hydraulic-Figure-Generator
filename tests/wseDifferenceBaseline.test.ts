import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createCanvas } from '@napi-rs/canvas'
import { createDefaultFigureSettings } from '../src/core/defaults'
import {
  createWseDifferenceRenderDocument,
  FRAMES,
  renderWseDifferenceDocument,
} from '../src/core/mapRenderer'
import { syntheticWseDifferenceScene } from './fixtures/syntheticHydraulics'

describe('WSE Difference production baseline', () => {
  it('keeps the accepted engineering defaults explicit', () => {
    const settings = createDefaultFigureSettings()

    assert.equal(settings.dryDepth, 0)
    assert.equal(settings.assessmentLineInterval, 1)
    assert.equal(settings.showDifferenceOutlines, true)
    assert.equal(settings.showWetDry, true)
    assert.equal(settings.showAssessmentLines, true)
    assert.equal(settings.showAssessmentLabels, true)
    assert.equal(settings.legendBound, null)
    assert.equal(settings.legendInterval, null)
    assert.equal(settings.differenceRamp, 'wseDifference')
    assert.equal(settings.centerlineStationing.visible, false)
    assert.deepEqual(FRAMES, {
      landscape: { width: 1650, height: 1275 },
      portrait: { width: 1275, height: 1650 },
    })
  })

  it('renders a deterministic synthetic comparison in both report frames', async () => {
    const scene = syntheticWseDifferenceScene()
    const commonBounds = { x0: 0, x1: 100, y0: 0, y1: 100 }

    for (const orientation of ['landscape', 'portrait'] as const) {
      const settings = {
        ...createDefaultFigureSettings(),
        orientation,
        basemapOpacity: 0,
        showOverlays: false,
      }
      const frame = FRAMES[orientation]
      const canvas = createCanvas(frame.width, frame.height)
      const elements = await renderWseDifferenceDocument(
        canvas as unknown as HTMLCanvasElement,
        createWseDifferenceRenderDocument({
          scene,
          commonBounds,
          settings,
        }),
      )

      assert.equal(canvas.width, frame.width)
      assert.equal(canvas.height, frame.height)
      assert.deepEqual(
        elements.map((element) => element.key),
        ['title', 'diffLegend', 'north', 'scale', 'wetDry'],
      )
      assert.equal(
        elements.every(
          (element) =>
            element.x >= 0 &&
            element.y >= 0 &&
            element.x + element.width <= frame.width &&
            element.y + element.height <= frame.height,
        ),
        true,
      )

      const pixels = canvas
        .getContext('2d')
        .getImageData(0, 0, frame.width, frame.height).data
      let coloredSamples = 0
      let darkSamples = 0
      for (let index = 0; index < pixels.length; index += 64) {
        const red = pixels[index]
        const green = pixels[index + 1]
        const blue = pixels[index + 2]
        if (Math.max(red, green, blue) - Math.min(red, green, blue) > 20) {
          coloredSamples += 1
        }
        if (red + green + blue < 240) darkSamples += 1
      }
      assert.ok(coloredSamples > 2_000)
      assert.ok(darkSamples > 100)
    }
  })
})
