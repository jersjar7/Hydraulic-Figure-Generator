import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  cartographyValidationIssues,
  classificationBreaks,
  MAX_CLASS_BANDS,
  MAX_CONTOUR_LEVELS,
  resolveClassificationScale,
  resolveContourLevels,
  strokeDashSegments,
} from '../src/core/cartography'
import { createDefaultFigureSettings } from '../src/core/defaults'
import { createDefaultPlanViewResultSettings } from '../src/features/plan-view-results/planViewResultSettings'
import {
  planViewCartographySettings,
  withPlanViewCartographySettings,
} from '../src/features/plan-view-results/planViewCartography'
import {
  withWseCartographySettings,
  wseCartographySettings,
} from '../src/features/wse-difference/wseCartography'

describe('shared cartography controls', () => {
  it('bounds classification and contour workloads', () => {
    const scale = resolveClassificationScale({
      minimum: -3,
      maximum: 3,
      requestedInterval: 0.00001,
      fallbackBandCount: 8,
    })
    assert.equal(scale.bandCount, MAX_CLASS_BANDS)
    assert.equal(classificationBreaks(-3, 3, scale.bandCount).length, 79)
    assert.equal(
      resolveContourLevels(0, 100, 0.00001, 1).length,
      MAX_CONTOUR_LEVELS + 1,
    )
  })

  it('uses one stroke vocabulary for contours and mesh lines', () => {
    assert.deepEqual(strokeDashSegments('solid', 2), [])
    assert.deepEqual(strokeDashSegments('dashed', 2), [10, 6])
    assert.deepEqual(strokeDashSegments('dotted', 2), [2, 4])
  })

  it('adapts WSE class boundaries without mutating source settings', () => {
    const settings = createDefaultFigureSettings()
    const cartography = wseCartographySettings(settings)
    assert.equal(cartography.classification.bounds.mode, 'symmetric')
    assert.equal(cartography.contours?.mode, 'class-boundaries')

    const next = withWseCartographySettings(settings, {
      ...cartography,
      classification: {
        ...cartography.classification,
        interval: 0.25,
      },
      contours: { ...cartography.contours!, pattern: 'dashed', width: 2.5 },
    })
    assert.equal(settings.legendInterval, null)
    assert.equal(next.legendInterval, 0.25)
    assert.equal(next.differenceOutlinePattern, 'dashed')
    assert.equal(next.differenceOutlineWidth, 2.5)
  })

  it('adapts Plan-View scalar isolines and mesh styles independently', () => {
    const settings = createDefaultPlanViewResultSettings()
    const cartography = planViewCartographySettings(settings)
    assert.equal(cartography.classification.bounds.mode, 'range')
    assert.equal(cartography.contours?.mode, 'scalar-isolines')

    const next = withPlanViewCartographySettings(settings, {
      ...cartography,
      contours: { ...cartography.contours!, interval: 0.5, pattern: 'dotted' },
      mesh: { ...cartography.mesh!, opacity: 0.4, pattern: 'dashed' },
    })
    assert.equal(next.contourInterval, 0.5)
    assert.equal(next.contourPattern, 'dotted')
    assert.equal(next.meshLineOpacity, 0.4)
    assert.equal(next.meshLinePattern, 'dashed')
  })

  it('reports invalid bounds, intervals, patterns, and opacity', () => {
    const cartography = planViewCartographySettings(
      createDefaultPlanViewResultSettings(),
    )
    const issues = cartographyValidationIssues({
      ...cartography,
      classification: {
        ...cartography.classification,
        bounds: { mode: 'range', minimum: 2, maximum: 1 },
        interval: -1,
      },
      contours: {
        ...cartography.contours!,
        pattern: 'invalid' as 'solid',
      },
      mesh: { ...cartography.mesh!, opacity: 2 },
    })
    assert.equal(issues.length, 4)
  })
})
