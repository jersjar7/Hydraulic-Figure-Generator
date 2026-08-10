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
    longitudinalProfileText: '',
    view: 'cross-sections',
    selectedSectionId: 'profile-section-1',
    crossSectionCulverts: [],
    longitudinalCulverts: [],
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
    project.longitudinalProfileText = 'Distance\tValue\n0\t25'
    project.view = 'longitudinal'
    project.crossSectionCulverts = [{
      sectionId: 'profile-section-1',
      name: 'Box Culvert',
      kind: 'box',
      scour: 2,
      bed: 1,
      center: null,
      width: 10,
      height: 6,
      span: 10,
      legHeight: 2,
      rise: 5,
      diameter: 6,
      color: '#222222',
      lineWidth: 2.5,
      dash: [],
    }]
    project.longitudinalCulverts = [{
      id: 'longitudinal-culvert-1',
      name: 'Road Crossing',
      leftStation: 100,
      rightStation: 125,
      invertLeft: 25,
      invertRight: 25.5,
      height: 8,
      color: '#222222',
      lineWidth: 2.5,
      dash: [10, 6],
    }]
    project.settings.legendPosition = 'bottom-right'
    project.settings.lineVisibility[2] = false
    project.settings.lineOrder = [1, 2, 0]
    assert.deepEqual(
      parseHydraulicProfileProject(serializeHydraulicProfileProject(project)),
      project,
    )
  })

  it('migrates version 4 files to shared chart-style defaults', () => {
    const older = JSON.parse(serializeHydraulicProfileProject(state()))
    older.version = 4
    delete older.settings.legendPosition
    delete older.settings.lineVisibility
    delete older.settings.lineOrder

    const parsed = parseHydraulicProfileProject(JSON.stringify(older))

    assert.equal(parsed.settings.legendPosition, 'top-right')
    assert.equal(parsed.settings.lineVisibility.every(Boolean), true)
    assert.deepEqual(parsed.settings.lineOrder.slice(0, 3), [0, 1, 2])
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
    const malformedCulvert = JSON.parse(serializeHydraulicProfileProject(state()))
    malformedCulvert.crossSectionCulverts = [{ kind: 'box', width: -1 }]
    assert.throws(
      () => parseHydraulicProfileProject(JSON.stringify(malformedCulvert)),
      /cross-section culverts are malformed/,
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
