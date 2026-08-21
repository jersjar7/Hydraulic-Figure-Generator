import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { velocityVectorSamples } from '../src/core/map/velocityVectorLayer'
import { createDefaultPlanViewResultSettings } from '../src/features/plan-view-results/planViewResultSettings'

describe('velocity vector plan-view layer', () => {
  it('keeps the strongest wet vector in each screen-space bucket', () => {
    const settings = {
      ...createDefaultPlanViewResultSettings().velocityVectors,
      spacing: 50,
      minimumMagnitude: 0.1,
    }
    const samples = velocityVectorSamples(
      new Float64Array([10, 20, 90, 140]),
      new Float64Array([10, 20, 10, 10]),
      {
        vx: new Float32Array([1, 2, 3, 4]),
        vy: new Float32Array([0, 0, 0, 0]),
        depth: new Float32Array([1, 1, 0, 1]),
        maxMagnitude: 4,
      },
      settings,
      0,
    )

    assert.deepEqual(
      samples.map((sample) => sample.magnitude),
      [2, 4],
    )
  })

  it('filters fill values and vectors below the requested speed', () => {
    const settings = {
      ...createDefaultPlanViewResultSettings().velocityVectors,
      minimumMagnitude: 0.5,
    }
    const samples = velocityVectorSamples(
      new Float64Array([0, 100, 200]),
      new Float64Array([0, 0, 0]),
      {
        vx: new Float32Array([0.25, -999, 1]),
        vy: new Float32Array([0, -999, 0]),
        maxMagnitude: 1,
      },
      settings,
      0,
    )
    assert.equal(samples.length, 1)
    assert.equal(samples[0].magnitude, 1)
  })
})
