import assert from 'node:assert/strict'
import { createCanvas } from '@napi-rs/canvas'
import { describe, it } from 'node:test'
import type { HydraulicProfileScene } from '../src/core/types'
import {
  HYDRAULIC_PROFILE_FRAMES,
  renderHydraulicProfileDocument,
} from '../src/features/hydraulic-profiles/hydraulicProfileRenderer'
import { createDefaultHydraulicProfileSettings } from '../src/features/hydraulic-profiles/hydraulicProfileSettings'

const source = (sourceIndex: number, elevations: number[]) => ({
  id: `series-${sourceIndex}`,
  sourceIndex,
  distances: [0, 10, 20, 30, 40],
  elevations,
})

const ground = source(0, [58, 55, 52, 55, 58])
const low = source(1, [56, 56, 56, 56, 56])
const high = source(2, [57, 57, 57, 57, 57])
const scene: HydraulicProfileScene = {
  conditionLabel: 'Proposed',
  section: {
    id: 'profile-section-1',
    sourceIndex: 0,
    station: 1047,
    stationLabel: '10+47',
    summaryZMinimum: 52,
    thalweg: 52,
    groundSourceIndex: 0,
    sourceSeries: [ground, low, high],
    ground: { ...ground, name: 'Proposed Ground', kind: 'ground' },
    surfaces: [
      { ...low, name: '2-year', kind: 'wse' },
      { ...high, name: '100-year', kind: 'wse' },
    ],
  },
}

describe('hydraulic profile renderer', () => {
  it('renders a report-ready multi-event section in both frames', () => {
    for (const orientation of ['landscape', 'portrait'] as const) {
      const settings = { ...createDefaultHydraulicProfileSettings(), orientation }
      const frame = HYDRAULIC_PROFILE_FRAMES[orientation]
      const canvas = createCanvas(frame.width, frame.height)
      renderHydraulicProfileDocument(canvas as unknown as HTMLCanvasElement, {
        scene,
        settings,
      })
      assert.equal(canvas.width, frame.width)
      assert.equal(canvas.height, frame.height)
      const pixels = canvas.getContext('2d').getImageData(0, 0, frame.width, frame.height).data
      let colored = 0
      let dark = 0
      for (let index = 0; index < pixels.length; index += 64) {
        const red = pixels[index]
        const green = pixels[index + 1]
        const blue = pixels[index + 2]
        if (Math.max(red, green, blue) - Math.min(red, green, blue) > 25) colored += 1
        if (red + green + blue < 360) dark += 1
      }
      assert.ok(colored > 150)
      assert.ok(dark > 100)
    }
  })
})
