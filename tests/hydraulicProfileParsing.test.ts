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

  it('infers the datasets-per-section block size independently from line semantics', () => {
    const pairs = parseSmsProfileValues(profile).value
    const rows = parseSmsSummaryTable(summary).value
    const dataset = buildHydraulicProfileDataset(pairs, rows, {})
    assert.equal(dataset.sections.length, 2)
    assert.equal(dataset.datasetsPerSection, 4)
    assert.equal(dataset.inferredDatasetsPerSection, 4)
    assert.equal(dataset.structureSource, 'summary')
    assert.deepEqual(
      dataset.configuration?.definitions.map(({ name, kind }) => [name, kind]),
      [
        ['Dataset 1', 'other'],
        ['Dataset 2', 'other'],
        ['Dataset 3', 'other'],
        ['Dataset 4', 'other'],
      ],
    )
    assert.deepEqual(
      dataset.sections.map((section) => section.stationLabel),
      ['Section 1', 'Section 2'],
    )
    assert.match(dataset.warnings[0], /ground dataset used to assign Summary Table station labels/)
  })

  it('applies engineer-defined names and roles consistently across stations', () => {
    const pairs = parseSmsProfileValues(profile).value
    const rows = parseSmsSummaryTable(summary).value
    const dataset = buildHydraulicProfileDataset(pairs, rows, {
      datasetConfiguration: {
        datasetsPerSection: 4,
        stationReferenceSlot: 0,
        definitions: [
          { slot: 0, name: 'Existing Ground', kind: 'ground' },
          { slot: 1, name: 'Proposed Ground', kind: 'ground' },
          { slot: 2, name: '2080 100-year', kind: 'wse' },
          { slot: 3, name: '500-year', kind: 'wse' },
        ],
      },
    })
    assert.deepEqual(
      dataset.sections.map((section) => section.stationLabel),
      ['10+47', '12+72'],
    )
    assert.equal(dataset.sections[0].primaryGround?.name, 'Existing Ground')
    assert.equal(dataset.sections[0].thalweg, 54.78)
    assert.deepEqual(dataset.sections[0].grounds.map(({ name }) => name), [
      'Existing Ground',
      'Proposed Ground',
    ])
    assert.deepEqual(
      dataset.sections[0].surfaces.map((surface) => surface.name),
      ['2080 100-year', '500-year'],
    )
    assert.deepEqual(
      dataset.sections[0].surfaces.map((surface) => surface.elevations[0]),
      [56, 58],
    )
    assert.deepEqual(
      dataset.sections[1].surfaces.map((surface) => surface.sourceIndex),
      [6, 7],
    )
  })

  it('reports a configured block size that does not divide the paste', () => {
    const pairs = parseSmsProfileValues(profile).value.slice(0, 7)
    const rows = parseSmsSummaryTable(summary).value
    const mismatched = buildHydraulicProfileDataset(pairs, rows, {
      datasetConfiguration: {
        datasetsPerSection: 4,
        stationReferenceSlot: 2,
        definitions: [
          { slot: 0, name: 'Line 1', kind: 'wse' },
          { slot: 1, name: 'Line 2', kind: 'wse' },
          { slot: 2, name: 'Ground', kind: 'ground' },
          { slot: 3, name: 'Line 4', kind: 'other' },
        ],
      },
    })
    assert.match(mismatched.warnings[0], /not divisible/)
    assert.equal(mismatched.sections[0].stationReferenceLine?.datasetSlot, 2)
  })

  it('recognizes the reported 40-series paste as ten sections with four datasets', () => {
    const minima = [38.33, 59.41, 60.54, 61.49, 63.08, 64.04, 25.61, 30.08, 24.74, 34.66]
    const pairs = minima.flatMap((groundMinimum, sectionIndex) => [
      { id: `wse-a-${sectionIndex}`, sourceIndex: sectionIndex * 4, distances: [0, 10], elevations: [groundMinimum + 2, groundMinimum + 2] },
      { id: `ground-${sectionIndex}`, sourceIndex: sectionIndex * 4 + 1, distances: [0, 10], elevations: [groundMinimum + 3, groundMinimum] },
      { id: `wse-b-${sectionIndex}`, sourceIndex: sectionIndex * 4 + 2, distances: [0, 10], elevations: [groundMinimum + 1, groundMinimum + 1] },
      { id: `wse-c-${sectionIndex}`, sourceIndex: sectionIndex * 4 + 3, distances: [0, 10], elevations: [groundMinimum + 1.5, groundMinimum + 1.5] },
    ])
    const rows = [...minima].sort((a, b) => a - b).map((zMinimum, index) => ({
      reach: 'Site2',
      station: index * 100,
      zMinimum,
    }))
    const detected = buildHydraulicProfileDataset(pairs, rows, {})
    assert.equal(detected.datasetsPerSection, 4)
    assert.equal(detected.sections.length, 10)

    const reviewed = buildHydraulicProfileDataset(pairs, rows, {
      datasetConfiguration: {
        datasetsPerSection: 4,
        stationReferenceSlot: 1,
        definitions: [
          { slot: 0, name: '2-year', kind: 'wse' },
          { slot: 1, name: 'Existing Ground', kind: 'ground' },
          { slot: 2, name: '100-year', kind: 'wse' },
          { slot: 3, name: '500-year', kind: 'wse' },
        ],
      },
    })
    assert.equal(reviewed.sections.length, 10)
    assert.ok(reviewed.sections.every((section) => section.summaryZMinimum === section.thalweg))
  })
})
