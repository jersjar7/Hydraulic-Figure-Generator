import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SmsProfileSeries } from '../src/core/types'
import { analyzeHydraulicProfileStationReferences } from '../src/core/hydraulic-profiles/analyzeStationReferences'
import { buildHydraulicProfileDataset } from '../src/core/hydraulic-profiles/buildHydraulicProfileDataset'

function series(sourceIndex: number, minimum: number): SmsProfileSeries {
  return {
    id: `series-${sourceIndex}`,
    sourceIndex,
    distances: [0, 5, 10],
    elevations: [minimum + 5, minimum, minimum + 5],
  }
}

const profileSeries = [
  series(0, 32), series(1, 30), series(2, 31),
  series(3, 22), series(4, 20), series(5, 21),
]
const summaryRows = [
  { reach: 'Site', station: 100, zMinimum: 20 },
  { reach: 'Site', station: 200, zMinimum: 30 },
]

describe('hydraulic profile station-reference analysis', () => {
  it('finds the dataset whose minima best match the Summary Table Z-min values', () => {
    const scores = analyzeHydraulicProfileStationReferences(profileSeries, summaryRows, 3)

    assert.equal(scores[0].slot, 1)
    assert.equal(scores[0].meanAbsoluteDifference, 0)
    assert.equal(scores[1].slot, 2)
    assert.equal(scores[2].slot, 0)
  })

  it('warns when a configured station ground is substantially worse than another dataset', () => {
    const dataset = buildHydraulicProfileDataset(profileSeries, summaryRows, {
      datasetConfiguration: {
        datasetsPerSection: 3,
        stationReferenceSlot: 0,
        definitions: [
          { slot: 0, name: 'Assigned Ground', kind: 'ground' },
          { slot: 1, name: 'Actual Ground', kind: 'wse' },
          { slot: 2, name: 'WSE', kind: 'wse' },
        ],
      },
    })

    assert.ok(dataset.warnings.some((warning) => (
      warning.includes('Dataset 2 is the closest Summary Z-min match')
      && warning.includes('selected ground used for station assignment, Dataset 1')
    )))
  })
})
