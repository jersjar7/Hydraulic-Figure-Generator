import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildHydraulicProfileDataset } from '../src/core/hydraulic-profiles/buildHydraulicProfileDataset'
import {
  parseSmsProfileValues,
  parseSmsSummaryTable,
} from '../src/core/hydraulic-profiles/smsClipboard'

const summary = [
  'Reach\tStation\tMin',
  'Hood Canal\t1047.09\t54.78',
  'Hood Canal\t1272.11\t65.25',
].join('\n')

const profile = [
  'Distance\tValue\tDistance\tValue\tDistance\tValue\tDistance\tValue\tDistance\tValue\tDistance\tValue\tDistance\tValue\tDistance\tValue',
  '1\t0\t57\t0\t60\t0\t56\t0\t58\t0\t68\t0\t70\t0\t67\t0\t69',
  '2\t10\t54.78\t10\t60\t10\t56\t10\t58\t10\t65.25\t10\t70\t10\t67\t10\t69',
  '3\t20\t57\t20\t60\t20\t56\t20\t58\t20\t68\t20\t70\t20\t67\t20\t69',
].join('\n')

describe('SMS hydraulic profile parsing', () => {
  it('preserves paired columns and drops the SMS row index', () => {
    const parsed = parseSmsProfileValues(profile)
    assert.equal(parsed.value.length, 8)
    assert.deepEqual(parsed.value[0].distances, [0, 10, 20])
    assert.deepEqual(parsed.value[0].elevations, [57, 54.78, 57])
    assert.deepEqual(parsed.warnings, [])
  })

  it('reads station and Z-min columns from a Summary Table', () => {
    const parsed = parseSmsSummaryTable(summary)
    assert.deepEqual(parsed.value, [
      { reach: 'Hood Canal', station: 1047.09, zMinimum: 54.78 },
      { reach: 'Hood Canal', station: 1272.11, zMinimum: 65.25 },
    ])
  })

  it('suggests one dataset mapping and applies it consistently across stations', () => {
    const pairs = parseSmsProfileValues(profile).value
    const rows = parseSmsSummaryTable(summary).value
    const dataset = buildHydraulicProfileDataset(pairs, rows, {
      conditionLabel: 'Proposed Conditions',
      eventNames: ['2-year', '100-year', '500-year'],
    })
    assert.equal(dataset.sections.length, 2)
    assert.deepEqual(
      dataset.sections.map((section) => section.stationLabel),
      ['10+47', '12+72'],
    )
    assert.equal(dataset.sections[0].ground.name, 'Proposed Ground')
    assert.equal(dataset.sections[0].thalweg, 54.78)
    assert.deepEqual(
      dataset.sections[0].surfaces.map((surface) => surface.name),
      ['2-year', '100-year', '500-year'],
    )
    assert.deepEqual(
      dataset.sections[0].surfaces.map((surface) => surface.elevations[0]),
      [56, 58, 60],
    )
    assert.deepEqual(dataset.mapping, {
      groundSlot: 0,
      surfaceSlots: [2, 3, 1],
    })
    assert.deepEqual(
      dataset.sections[1].surfaces.map((surface) => surface.sourceIndex),
      [6, 7, 5],
    )
  })

  it('reports mismatched event counts and honors a reviewed global mapping', () => {
    const pairs = parseSmsProfileValues(profile).value.slice(0, 7)
    const rows = parseSmsSummaryTable(summary).value
    const mismatched = buildHydraulicProfileDataset(pairs, rows, {
      conditionLabel: 'Existing',
      eventNames: ['2-year', '100-year', '500-year'],
      datasetMapping: { groundSlot: 2, surfaceSlots: [0, 1, 3] },
    })
    assert.match(mismatched.warnings[0], /not divisible/)
    assert.equal(mismatched.sections[0].groundSourceIndex, 2)
  })

  it('keeps explicit event identities even when their elevation order crosses', () => {
    const pairs = parseSmsProfileValues(profile).value
    const rows = parseSmsSummaryTable(summary).value
    const dataset = buildHydraulicProfileDataset(pairs, rows, {
      conditionLabel: 'Proposed',
      eventNames: ['2080 100-year', '500-year', '2-year'],
      datasetMapping: { groundSlot: 0, surfaceSlots: [1, 3, 2] },
    })
    assert.deepEqual(
      dataset.sections[0].surfaces.map((surface) => [surface.name, surface.sourceIndex]),
      [['2080 100-year', 1], ['500-year', 3], ['2-year', 2]],
    )
    assert.deepEqual(
      dataset.sections[1].surfaces.map((surface) => [surface.name, surface.sourceIndex]),
      [['2080 100-year', 5], ['500-year', 7], ['2-year', 6]],
    )
  })
})
