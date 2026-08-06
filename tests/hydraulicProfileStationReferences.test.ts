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

  it('warns when an explicit station ground differs from the detected lowest profile', () => {
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
      warning.includes('Dataset 2 is the lowest profile in 2 of 2 sections')
      && warning.includes('Dataset 1 was explicitly selected')
    )))
  })

  it('detects a station ground without silently changing its engineer-defined role', () => {
    const dataset = buildHydraulicProfileDataset(profileSeries, summaryRows, {
      datasetConfiguration: {
        datasetsPerSection: 3,
        stationReferenceSlot: null,
        definitions: [
          { slot: 0, name: 'Event A', kind: 'wse' },
          { slot: 1, name: 'Event B', kind: 'wse' },
          { slot: 2, name: 'Event C', kind: 'wse' },
        ],
      },
    })

    assert.deepEqual(dataset.mappingStatus, {
      ready: false,
      referenceSlot: 1,
      recommendedSlot: 1,
      source: 'detected',
      message: 'Dataset 2 appears to be the station ground but is currently classified as WSE. Review its dataset role before generating.',
    })
    assert.equal(dataset.sections[0].stationReferenceLine?.datasetSlot, 1)
    assert.equal(dataset.sections[0].primaryGround, null)
  })

  it('pairs sections and stations by order while treating Summary Z-min as diagnostic', () => {
    const misleadingRows = [
      { reach: 'Site', station: 100, zMinimum: 100 },
      { reach: 'Site', station: 200, zMinimum: 0 },
    ]
    const dataset = buildHydraulicProfileDataset(profileSeries, misleadingRows, {
      datasetConfiguration: {
        datasetsPerSection: 3,
        stationReferenceSlot: 1,
        definitions: [
          { slot: 0, name: 'High WSE', kind: 'wse' },
          { slot: 1, name: 'Ground', kind: 'ground' },
          { slot: 2, name: 'Low WSE', kind: 'wse' },
        ],
      },
    })

    assert.deepEqual(
      dataset.sections.map(({ sourceIndex, station }) => [sourceIndex, station]),
      [[1, 100], [0, 200]],
    )
    assert.ok(dataset.warnings.some((warning) => warning.includes('Station assignment is by thalweg order')))
  })
})
