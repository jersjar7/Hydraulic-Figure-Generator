import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyzeHydraulicProfileStationReferences } from '../src/core/hydraulic-profiles/analyzeStationReferences'
import { buildHydraulicProfileDataset } from '../src/core/hydraulic-profiles/buildHydraulicProfileDataset'
import {
  SITE2_EXPECTED_SOURCE_ORDER,
  SITE2_PROFILE_SERIES,
  SITE2_SUMMARY_ROWS,
} from './fixtures/site2HydraulicProfile'

describe('Site 2 hydraulic profile regression baseline', () => {
  it('identifies Dataset 2 as the Summary-compatible ground', () => {
    const scores = analyzeHydraulicProfileStationReferences(
      SITE2_PROFILE_SERIES,
      SITE2_SUMMARY_ROWS,
      4,
    )

    assert.equal(scores[0].slot, 1)
    assert.ok(scores[0].meanAbsoluteDifference < 0.001)
    assert.ok(scores[1].meanAbsoluteDifference > 0.9)
  })

  it('reconstructs all 11 sections when Dataset 2 is the station ground', () => {
    const dataset = buildHydraulicProfileDataset(
      SITE2_PROFILE_SERIES,
      SITE2_SUMMARY_ROWS,
      {
        datasetConfiguration: {
          datasetsPerSection: 4,
          stationReferenceSlot: 1,
          definitions: [
            { slot: 0, name: '500-year', kind: 'wse' },
            { slot: 1, name: 'Existing Ground', kind: 'ground' },
            { slot: 2, name: '2-year', kind: 'wse' },
            { slot: 3, name: '100-year', kind: 'wse' },
          ],
        },
      },
    )

    assert.equal(dataset.sections.length, 11)
    assert.deepEqual(
      dataset.sections.map(({ sourceIndex }) => sourceIndex),
      SITE2_EXPECTED_SOURCE_ORDER,
    )
    assert.deepEqual(
      dataset.sections.map(({ station }) => station),
      SITE2_SUMMARY_ROWS.map(({ station }) => station),
    )
    dataset.sections.forEach((section) => {
      assert.equal(section.primaryGround?.datasetSlot, 1)
      assert.equal(section.surfaces.length, 3)
      assert.equal(section.lines.length, 4)
    })
  })
})
