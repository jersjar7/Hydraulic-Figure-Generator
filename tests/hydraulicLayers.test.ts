import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  differenceBandCount,
  differenceBreaks,
} from '../src/core/map/hydraulicLayers'

describe('WSE difference rendering classes', () => {
  it('uses eight balanced classes for an automatic legend', () => {
    assert.equal(differenceBandCount(3, null), 8)
    assert.deepEqual(differenceBreaks(3, null), [
      -2.25,
      -1.5,
      -0.75,
      0,
      0.75,
      1.5,
      2.25,
    ])
  })

  it('derives class boundaries from an engineer-selected interval', () => {
    assert.equal(differenceBandCount(2, 0.5), 8)
    assert.deepEqual(differenceBreaks(2, 0.5), [
      -1.5,
      -1,
      -0.5,
      0,
      0.5,
      1,
      1.5,
    ])
  })

  it('caps pathological intervals to a bounded render workload', () => {
    assert.equal(differenceBandCount(10, 0.001), 80)
  })
})
