import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDefaultFigureSettings } from '../src/core/defaults'
import {
  resolveScalarResultScale,
  scalarContourLevels,
} from '../src/core/map/scalarResultScale'
import type {
  PlanViewResultScene,
  PlanViewResultSettings,
} from '../src/core/types'

function settings(): PlanViewResultSettings {
  return {
    ...createDefaultFigureSettings(),
    resultParameter: 'Water_Depth_ft',
    ramp: 'depth',
    legendMin: null,
    legendMax: null,
    scalarLegendInterval: null,
    showContours: true,
    contourInterval: null,
    contourColor: '#111111',
    contourWidth: 1,
  }
}

describe('scalar result scale', () => {
  it('uses scene-derived bounds until the user overrides them', () => {
    const scene = {
      autoMin: 0,
      autoMax: 5,
      autoInterval: 0.5,
    } as PlanViewResultScene
    assert.deepEqual(resolveScalarResultScale(scene, settings()), {
      minimum: 0,
      maximum: 5,
      interval: 0.5,
      bandCount: 10,
    })
    assert.deepEqual(
      resolveScalarResultScale(scene, {
        ...settings(),
        legendMin: 1,
        legendMax: 3,
        scalarLegendInterval: 0.25,
      }),
      {
        minimum: 1,
        maximum: 3,
        interval: 0.25,
        bandCount: 8,
      },
    )
  })

  it('builds bounded contour levels from the displayed range', () => {
    assert.deepEqual(scalarContourLevels(0, 2, 0.5, 1), [0, 0.5, 1, 1.5, 2])
    assert.ok(scalarContourLevels(0, 1000, 0.001, 1).length <= 161)
  })
})
