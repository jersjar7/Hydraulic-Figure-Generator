import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createPlanViewWorkspaceUiState,
  planViewWorkspaceUiReducer,
} from '../src/features/plan-view-results/planViewWorkspaceUi'

describe('Plan-View workspace UI state', () => {
  it('updates one transient field without changing the others', () => {
    const initial = createPlanViewWorkspaceUiState()
    const next = planViewWorkspaceUiReducer(initial, {
      type: 'field/set',
      field: 'productionMode',
      value: 'set',
    })

    assert.equal(next.productionMode, 'set')
    assert.equal(next.activeSection, initial.activeSection)
    assert.equal(next.leftCollapsed, initial.leftCollapsed)
  })

  it('restores project-reset fields while preserving open panels and element selection', () => {
    const state = {
      ...createPlanViewWorkspaceUiState(),
      notices: [{ level: 'warning' as const, text: 'Review this' }],
      busy: true,
      leftOpen: true,
      leftCollapsed: true,
      rightOpen: true,
      productionMode: 'document' as const,
      activeSection: 'annotations' as const,
      activeElement: 'legend' as const,
    }

    const next = planViewWorkspaceUiReducer(state, { type: 'project/reset' })

    assert.deepEqual(next.notices, [])
    assert.equal(next.busy, false)
    assert.equal(next.leftCollapsed, false)
    assert.equal(next.productionMode, 'figure')
    assert.equal(next.activeSection, 'result')
    assert.equal(next.leftOpen, true)
    assert.equal(next.rightOpen, true)
    assert.equal(next.activeElement, 'legend')
  })
})
