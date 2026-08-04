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
    eventNames: ['2-year', '100-year'],
    summaryText: 'Reach\tStation\tMin',
    profileText: 'Distance\tValue',
    selectedSectionId: 'profile-section-1',
    groundOverrides: { 0: 1 },
    settings: createDefaultHydraulicProfileSettings(),
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
    malformed.eventNames = []
    assert.throws(
      () => parseHydraulicProfileProject(JSON.stringify(malformed)),
      /inputs are malformed/,
    )
    malformed.eventNames = ['2-year']
    malformed.settings.groundStyle.width = 0
    assert.throws(
      () => parseHydraulicProfileProject(JSON.stringify(malformed)),
      /invalid numeric values/,
    )
  })
})
