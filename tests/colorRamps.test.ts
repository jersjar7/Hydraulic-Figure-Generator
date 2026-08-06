import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  COLOR_RAMP_CATALOG,
  COLOR_RAMP_OPTIONS,
  DEFAULT_COLOR_RAMP_BY_USE,
  SCALAR_COLOR_RAMP_OPTIONS,
  colorRampColor,
  colorRampGradient,
} from '../src/core/colorRamps'
import { differenceColor } from '../src/core/map/hydraulicLayers'

describe('shared hydraulic color ramps', () => {
  it('publishes the accepted WSE ramp and all eight Appendix K ramps once', () => {
    assert.equal(COLOR_RAMP_OPTIONS.length, 9)
    assert.equal(SCALAR_COLOR_RAMP_OPTIONS.length, 8)
    assert.equal(DEFAULT_COLOR_RAMP_BY_USE.wseDifference, 'wseDifference')
    for (const ramp of SCALAR_COLOR_RAMP_OPTIONS) {
      assert.equal(ramp.source, 'SMS/FHWA')
      assert.equal(ramp.stops.length, 9)
    }
  })

  it('interpolates colors and builds one reusable preview gradient', () => {
    assert.equal(colorRampColor('depth', 0), 'rgb(194,217,238)')
    assert.equal(colorRampColor('depth', 1), 'rgb(8,49,108)')
    assert.match(colorRampGradient('velocity'), /^linear-gradient\(90deg,/)
    assert.match(colorRampGradient('velocity'), /rgb\(255,7,0\) 100%/)
  })

  it('uses the figure default unless an engineer selects another ramp', () => {
    assert.equal(differenceColor(-2, 2), 'rgb(0,31,176)')
    assert.equal(differenceColor(2, 2), 'rgb(197,32,32)')
    assert.equal(
      differenceColor(2, 2, 'depth'),
      colorRampColor('depth', 1),
    )
    assert.equal(COLOR_RAMP_CATALOG.wseDifference.label, 'WSE Difference')
  })
})
