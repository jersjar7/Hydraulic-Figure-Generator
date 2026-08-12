import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { withPlanViewOutputSettings } from '../src/features/plan-view-results/planViewOutputSettings'
import { createDefaultPlanViewResultSettings } from '../src/features/plan-view-results/planViewResultSettings'

describe('Plan-View output settings policy', () => {
  it('applies output metadata without mutating unrelated figure settings', () => {
    const settings = {
      ...createDefaultPlanViewResultSettings(),
      zoom: 1.75,
      legendMin: -4,
      legendMax: 8,
      scalarLegendInterval: 0.5,
    }
    const original = structuredClone(settings)

    const next = withPlanViewOutputSettings(settings, {
      paramName: 'Velocity_ft_p_s',
      label: 'Velocity',
      units: 'ft/s',
      defaultRamp: 'velocity',
    })

    assert.equal(next.resultParameter, 'Velocity_ft_p_s')
    assert.equal(next.ramp, 'velocity')
    assert.equal(next.legendMin, null)
    assert.equal(next.legendMax, null)
    assert.equal(next.scalarLegendInterval, null)
    assert.equal(next.elementStyles.diffLegend.title, 'Velocity')
    assert.equal(next.elementStyles.diffLegend.units, 'ft/s')
    assert.equal(next.zoom, 1.75)
    assert.deepEqual(settings, original)
  })
})
