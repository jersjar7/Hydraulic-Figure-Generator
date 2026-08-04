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
import { buildScalarResultScene } from '../src/core/hydraulics/scalarResultBuilder'
import {
  syntheticGeometry,
  syntheticRunSelection,
} from './fixtures/syntheticHydraulics'

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

  it('treats nonpositive Water Depth values as dry without masking other results', () => {
    const geometry = syntheticGeometry()
    const selection = syntheticRunSelection('EX', 'Existing', 'Run', geometry)
    selection.run.params.Water_Depth_ft = { shape: [1, 4], vector: false }
    const depth = buildScalarResultScene(
      selection,
      'Water_Depth_ft',
      new Float32Array([-1, 0, 0.25, 1]),
    )
    assert.equal(depth.validNodes, 2)
    assert.deepEqual(Array.from(depth.values), [-999, -999, 0.25, 1])

    selection.run.params.Froude = { shape: [1, 4], vector: false }
    const froude = buildScalarResultScene(
      selection,
      'Froude',
      new Float32Array([0, 0.1, 0.2, 0.3]),
    )
    assert.equal(froude.validNodes, 4)
  })
})
