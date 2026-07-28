import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { inferScenarioDescriptor } from '../src/core/hydraulicEngine'

describe('hydraulic scenario detection', () => {
  it('recognizes established Existing, Proposed, FHD, and Natural names', () => {
    assert.deepEqual(inferScenarioDescriptor('Mesh', 'EX-Geo.h5'), {
      key: 'EX',
      label: 'Existing',
      kind: 'existing',
    })
    assert.deepEqual(inferScenarioDescriptor('Mesh', 'FHD_Datasets.h5'), {
      key: 'PR',
      label: 'Proposed',
      kind: 'proposed',
    })
    assert.deepEqual(inferScenarioDescriptor('Mesh', 'Na-geo.h5'), {
      key: 'NA',
      label: 'Natural',
      kind: 'natural',
    })
    assert.equal(
      inferScenarioDescriptor('Natural 100YR (SRH-2D)', 'results.h5')?.key,
      'NA',
    )
  })

  it('pairs arbitrary geometry and datasets files by their shared stem', () => {
    const geometry = inferScenarioDescriptor(
      'Hydraulic Mesh',
      'Alternative_A_Geometry.h5',
    )
    const datasets = inferScenarioDescriptor(
      'Existing 100YR',
      'Alternative_A_Datasets.h5',
    )

    assert.deepEqual(geometry, {
      key: 'ALTERNATIVE_A',
      label: 'Alternative A',
      kind: 'other',
    })
    assert.deepEqual(datasets, geometry)
  })
})
