import assert from 'node:assert/strict'
import { createCanvas } from '@napi-rs/canvas'
import { describe, it } from 'node:test'
import { buildHydraulicCrossSectionScene } from '../src/core/hydraulics/crossSectionBuilder'
import {
  CROSS_SECTION_FRAMES,
  renderCrossSectionDocument,
} from '../src/features/cross-section/crossSectionRenderer'
import { createDefaultCrossSectionSettings } from '../src/features/cross-section/crossSectionSettings'
import {
  syntheticGeometry,
  syntheticRunSelection,
} from './fixtures/syntheticHydraulics'

function syntheticCrossSectionScene() {
  const baselineGeometry = syntheticGeometry()
  const comparisonGeometry = syntheticGeometry()
  baselineGeometry.z = new Float32Array([7, 9, 7.5, 9.5])
  comparisonGeometry.z = new Float32Array([6.8, 8.8, 7.3, 9.3])
  const baseline = syntheticRunSelection(
    'EX',
    'Existing',
    'Existing 100YR',
    baselineGeometry,
  )
  const comparison = syntheticRunSelection(
    'PR',
    'Proposed',
    'Proposed 100YR',
    comparisonGeometry,
  )
  return buildHydraulicCrossSectionScene({
    baseline,
    comparison,
    line: {
      id: 'section-1000',
      label: 'Section 10+00',
      points: [
        { x: 0, y: 50 },
        { x: 100, y: 50 },
      ],
      direction: 'a-to-b',
    },
    baselineResults: {
      ground: baselineGeometry.z,
      wse: new Float32Array([10.4, 10.4, 10.4, 10.4]),
      depth: new Float32Array([2, 2, 2, 2]),
      velocity: {
        vx: new Float32Array(4),
        vy: new Float32Array([2, 2, 2, 2]),
      },
    },
    comparisonResults: {
      ground: comparisonGeometry.z,
      wse: new Float32Array([9.8, 9.8, 9.8, 9.8]),
      depth: new Float32Array([2, 2, 2, 2]),
      velocity: {
        vx: new Float32Array(4),
        vy: new Float32Array([1.5, 1.5, 1.5, 1.5]),
      },
    },
    dryDepth: 0,
    sampleSpacing: 1,
  })
}

describe('cross-section production baseline', () => {
  it('keeps the WSDOT comparison defaults explicit', () => {
    const settings = createDefaultCrossSectionSettings()
    assert.equal(settings.dryDepth, 0)
    assert.equal(settings.sampleSpacing, 1)
    assert.equal(settings.showAverageWse, true)
    assert.equal(settings.showDifferenceArrow, true)
    assert.deepEqual(settings.existingGroundStyle.dash, [12, 7])
    assert.deepEqual(settings.proposedGroundStyle.dash, [])
  })

  it('renders profiles, averages, and a difference arrow in both frames', () => {
    const scene = syntheticCrossSectionScene()
    for (const orientation of ['landscape', 'portrait'] as const) {
      const settings = {
        ...createDefaultCrossSectionSettings(),
        orientation,
        sectionName: 'ROW Section 10+00',
      }
      const frame = CROSS_SECTION_FRAMES[orientation]
      const canvas = createCanvas(frame.width, frame.height)
      renderCrossSectionDocument(
        canvas as unknown as HTMLCanvasElement,
        { scene, settings },
      )

      assert.equal(canvas.width, frame.width)
      assert.equal(canvas.height, frame.height)
      const pixels = canvas
        .getContext('2d')
        .getImageData(0, 0, frame.width, frame.height).data
      let colored = 0
      let dark = 0
      for (let index = 0; index < pixels.length; index += 64) {
        const red = pixels[index]
        const green = pixels[index + 1]
        const blue = pixels[index + 2]
        if (Math.max(red, green, blue) - Math.min(red, green, blue) > 25) {
          colored += 1
        }
        if (red + green + blue < 300) dark += 1
      }
      assert.ok(colored > 150)
      assert.ok(dark > 100)
    }
  })
})
