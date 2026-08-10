import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { CrossSectionLine } from '../src/core/types'
import { moveManualCrossSectionEndpoint } from '../src/features/cross-section/crossSectionSelectionGeometry'

describe('manual cross-section endpoint editing', () => {
  it('moves one endpoint and recalculates the section length', () => {
    const line: CrossSectionLine = {
      id: 'manual-1',
      label: 'Manual Section 1',
      source: 'manual',
      direction: 'a-to-b',
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      lengthFeet: 20,
    }

    const moved = moveManualCrossSectionEndpoint(
      line,
      1,
      { x: 10, y: 10 },
      2,
    )

    assert.deepEqual(moved.points, [{ x: 0, y: 0 }, { x: 10, y: 10 }])
    assert.ok(Math.abs((moved.lengthFeet ?? 0) - Math.sqrt(200) * 2) < 1e-9)
    assert.deepEqual(line.points, [{ x: 0, y: 0 }, { x: 10, y: 0 }])
  })

  it('does not edit generated assessment lines', () => {
    const line: CrossSectionLine = {
      id: 'assessment-1',
      label: 'Assessment',
      source: 'assessment',
      direction: 'a-to-b',
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
    }
    assert.equal(
      moveManualCrossSectionEndpoint(line, 1, { x: 20, y: 20 }, 1),
      line,
    )
  })
})
