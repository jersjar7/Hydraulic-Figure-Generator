import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createHydraulicProfilesWorkspaceUiState,
  hydraulicProfilesWorkspaceUiReducer,
} from '../src/features/hydraulic-profiles/hydraulicProfilesWorkspaceUi'

describe('Hydraulic Profiles workspace UI state', () => {
  it('updates one transient field without changing the others', () => {
    const initial = createHydraulicProfilesWorkspaceUiState()
    const next = hydraulicProfilesWorkspaceUiReducer(initial, {
      type: 'field/set',
      field: 'activeSection',
      value: 'axes',
    })

    assert.equal(next.activeSection, 'axes')
    assert.equal(next.leftCollapsed, initial.leftCollapsed)
    assert.equal(next.rightOpen, initial.rightOpen)
  })

  it('clears generated notices and reopens inputs on project reset', () => {
    const state = {
      ...createHydraulicProfilesWorkspaceUiState(),
      runtimeNotices: [{ level: 'warning' as const, text: 'Review this' }],
      leftOpen: true,
      leftCollapsed: true,
      rightOpen: true,
      activeSection: 'export' as const,
    }
    const next = hydraulicProfilesWorkspaceUiReducer(state, {
      type: 'project/reset',
    })

    assert.deepEqual(next.runtimeNotices, [])
    assert.equal(next.leftCollapsed, false)
    assert.equal(next.leftOpen, true)
    assert.equal(next.rightOpen, true)
    assert.equal(next.activeSection, 'export')
  })
})
