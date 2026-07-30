import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildHydraulicCrossSectionScene } from '../src/core/hydraulics/crossSectionBuilder'
import { dischargeWeightedAverage } from '../src/core/hydraulics/meshCrossSectionSampler'
import {
  syntheticGeometry,
  syntheticRunSelection,
} from './fixtures/syntheticHydraulics'

describe('cross-section hydraulics', () => {
  it('computes a discharge-weighted WSE from section flow', () => {
    const average = dischargeWeightedAverage(
      [0, 10, 20],
      [10, 12, 14],
      [1, 2, 1],
      [2, 2, 2],
      0,
    )

    assert.equal(average.discharge, 60)
    assert.equal(average.value, 12)
    assert.equal(average.wetStart, 0)
    assert.equal(average.wetEnd, 20)
  })

  it('samples independent meshes and reports the proposed-minus-existing average', () => {
    const baselineGeometry = syntheticGeometry()
    const comparisonGeometry = syntheticGeometry()
    baselineGeometry.z = new Float32Array([8, 8, 8, 8])
    comparisonGeometry.z = new Float32Array([7.5, 7.5, 7.5, 7.5])
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

    const scene = buildHydraulicCrossSectionScene({
      baseline,
      comparison,
      line: {
        id: 'section-1',
        label: 'Section 10+00',
        points: [
          { x: 0, y: 50 },
          { x: 100, y: 50 },
        ],
        direction: 'a-to-b',
      },
      baselineResults: {
        ground: baselineGeometry.z,
        wse: new Float32Array([10, 10, 10, 10]),
        depth: new Float32Array([2, 2, 2, 2]),
        velocity: {
          vx: new Float32Array([0, 0, 0, 0]),
          vy: new Float32Array([2, 2, 2, 2]),
        },
      },
      comparisonResults: {
        ground: comparisonGeometry.z,
        wse: new Float32Array([9.5, 10.5, 9.5, 10.5]),
        depth: new Float32Array([2, 2, 2, 2]),
        velocity: {
          vx: new Float32Array([0, 0, 0, 0]),
          vy: new Float32Array([1, 1, 1, 1]),
        },
      },
      dryDepth: 0,
      sampleSpacing: 1,
    })

    assert.equal(scene.samples.length, 101)
    assert.ok(scene.baselineAverage.value != null)
    assert.ok(Math.abs(scene.baselineAverage.value - 10) < 1e-6)
    assert.ok(scene.comparisonAverage.value != null)
    assert.ok(Math.abs(scene.comparisonAverage.value - 10) < 1e-6)
    assert.ok(scene.wseDifference != null)
    assert.ok(Math.abs(scene.wseDifference) < 1e-6)
    assert.equal(scene.warnings.length, 0)
    assert.equal(scene.samples[50].baselineGround, 8)
    assert.equal(scene.samples[50].comparisonGround, 7.5)
  })

  it('withholds the weighted average when vector velocity is unavailable', () => {
    const geometry = syntheticGeometry()
    const baseline = syntheticRunSelection(
      'EX',
      'Existing',
      'Existing 100YR',
      geometry,
    )
    const comparison = syntheticRunSelection(
      'PR',
      'Proposed',
      'Proposed 100YR',
      geometry,
    )
    const results = {
      ground: geometry.z,
      wse: new Float32Array([10, 10, 10, 10]),
      depth: new Float32Array([1, 1, 1, 1]),
    }

    const scene = buildHydraulicCrossSectionScene({
      baseline,
      comparison,
      line: {
        id: 'section-2',
        label: 'ROW',
        points: [
          { x: 0, y: 50 },
          { x: 100, y: 50 },
        ],
        direction: 'a-to-b',
      },
      baselineResults: results,
      comparisonResults: results,
      dryDepth: 0,
      sampleSpacing: 2,
    })

    assert.equal(scene.baselineAverage.value, null)
    assert.equal(scene.comparisonAverage.value, null)
    assert.equal(scene.wseDifference, null)
    assert.equal(scene.warnings.length, 2)
  })
})
