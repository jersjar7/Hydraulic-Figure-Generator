import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseHydraulicProfileProject,
  serializeHydraulicProfileProject,
  type HydraulicProfileProjectState,
} from '../src/features/hydraulic-profiles/hydraulicProfileProjectFile'
import { createDefaultHydraulicProfileSettings } from '../src/features/hydraulic-profiles/hydraulicProfileSettings'

function state(): HydraulicProfileProjectState {
  return {
    conditionLabel: 'Proposed Conditions',
    summaryText: 'Reach\tStation\tMin',
    profileText: 'Distance\tValue',
    selectedSectionId: 'profile-section-1',
    datasetConfiguration: {
      datasetsPerSection: 3,
      stationReferenceSlot: 1,
      definitions: [
        { slot: 0, name: 'Existing Ground', kind: 'ground' },
        { slot: 1, name: 'Proposed Ground', kind: 'ground' },
        { slot: 2, name: '100-year WSE', kind: 'wse' },
      ],
    },
    settings: {
      ...createDefaultHydraulicProfileSettings(),
      clipWseAtGround: false,
      wseClippingGroundSlot: 1,
    },
  }
}

describe('hydraulic profile project files', () => {
  it('round-trips clipboard inputs, mapping review, and figure settings', () => {
    const project = state()
    assert.deepEqual(
      parseHydraulicProfileProject(serializeHydraulicProfileProject(project)),
      project,
    )
  })

  it('rejects malformed inputs and invalid line styles', () => {
    const malformed = JSON.parse(serializeHydraulicProfileProject(state()))
    malformed.datasetConfiguration.definitions = []
    assert.throws(
      () => parseHydraulicProfileProject(JSON.stringify(malformed)),
      /dataset definitions are malformed/,
    )
    malformed.datasetConfiguration = state().datasetConfiguration
    malformed.settings.lineStyles[0].width = 0
    assert.throws(
      () => parseHydraulicProfileProject(JSON.stringify(malformed)),
      /invalid numeric values/,
    )
  })

  it('defaults older project files to clipped WSE extents', () => {
    const older = JSON.parse(serializeHydraulicProfileProject(state()))
    delete older.settings.clipWseAtGround
    delete older.settings.wseClippingGroundSlot

    const parsed = parseHydraulicProfileProject(JSON.stringify(older))

    assert.equal(parsed.settings.clipWseAtGround, true)
    assert.equal(parsed.settings.wseClippingGroundSlot, null)
  })

  it('migrates version 3 preset defaults to detected station-ground selection', () => {
    const older = JSON.parse(serializeHydraulicProfileProject(state()))
    older.version = 3
    older.datasetConfiguration = {
      datasetsPerSection: 4,
      stationReferenceSlot: 0,
      definitions: [
        { slot: 0, name: 'Existing Ground', kind: 'ground' },
        { slot: 1, name: '2-year', kind: 'wse' },
        { slot: 2, name: '100-year', kind: 'wse' },
        { slot: 3, name: '500-year', kind: 'wse' },
      ],
    }

    const parsed = parseHydraulicProfileProject(JSON.stringify(older))

    assert.equal(parsed.datasetConfiguration?.stationReferenceSlot, null)
  })

  it('migrates the legacy one-ground event mapping without changing its labels', () => {
    const legacy = {
      version: 2,
      figureId: 'hydraulic-profiles-sections',
      conditionLabel: 'Proposed Conditions',
      eventNames: ['2080 100-year', '500-year'],
      summaryText: '',
      profileText: '',
      selectedSectionId: '',
      datasetMapping: { groundSlot: 1, surfaceSlots: [2, 0] },
      settings: {
        ...createDefaultHydraulicProfileSettings(),
        groundStyle: { color: '#654321', width: 3, dash: [] },
        surfaceStyles: [
          { color: '#ff0000', width: 2, dash: [] },
          { color: '#00ff00', width: 2, dash: [4, 2] },
        ],
      },
    }
    const migrated = parseHydraulicProfileProject(JSON.stringify(legacy))
    assert.deepEqual(migrated.datasetConfiguration?.definitions, [
      { slot: 0, name: '500-year', kind: 'wse' },
      { slot: 1, name: 'Proposed Ground', kind: 'ground' },
      { slot: 2, name: '2080 100-year', kind: 'wse' },
    ])
    assert.equal(migrated.settings.lineStyles[1].color, '#654321')
    assert.equal(migrated.settings.lineStyles[2].color, '#ff0000')
    assert.equal(migrated.settings.lineStyles[0].color, '#00ff00')
  })
})
