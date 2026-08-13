import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createCrossSectionWorkspaceUiState,
  crossSectionWorkspaceUiReducer,
} from '../src/features/cross-section/crossSectionWorkspaceUi'

describe('Cross-Section workspace UI state', () => {
  it('updates one transient field without changing the others', () => {
    const initial = createCrossSectionWorkspaceUiState()
    const next = crossSectionWorkspaceUiReducer(initial, {
      type: 'field/set',
      field: 'activeSection',
      value: 'axes',
    })

    assert.equal(next.activeSection, 'axes')
    assert.equal(next.leftCollapsed, initial.leftCollapsed)
    assert.equal(next.rightOpen, initial.rightOpen)
  })

  it('bounds notices and clears runtime state during project reset', () => {
    const notices = Array.from({ length: 41 }, (_, index) => ({
      level: 'warning' as const,
      text: `Notice ${index + 1}`,
    }))
    const appended = crossSectionWorkspaceUiReducer(
      createCrossSectionWorkspaceUiState(),
      { type: 'notices/append', notices },
    )
    assert.equal(appended.notices.length, 40)
    assert.equal(appended.notices[0].text, 'Notice 2')

    const reset = crossSectionWorkspaceUiReducer(
      { ...appended, busy: true, leftCollapsed: true, rightOpen: true },
      { type: 'project/reset' },
    )
    assert.deepEqual(reset.notices, [])
    assert.equal(reset.busy, false)
    assert.equal(reset.leftCollapsed, false)
    assert.equal(reset.rightOpen, true)
  })
})
