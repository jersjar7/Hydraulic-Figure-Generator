import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { MapOverlay } from '../src/core/types'
import { createHydraulicProjectInputActions } from '../src/features/project-workspace/hydraulicProjectInputActions'

const overlay = (id: string): MapOverlay => ({
  id,
  name: id,
  color: '#000000',
  width: 1,
  visible: true,
  geojson: {
    type: 'FeatureCollection',
    features: [],
  },
})

describe('shared hydraulic project input actions', () => {
  it('invalidates figure and assessment state for scenario changes', () => {
    let overlays = [overlay('one'), overlay('two')]
    let selectionChanges = 0
    let assessmentChanges = 0
    const removed: string[] = []
    const roles: string[] = []
    const runs: string[] = []
    const actions = createHydraulicProjectInputActions({
      assessmentId: 'EX',
      overlays,
      ingest: async () => [],
      removeCondition: (key) => removed.push(key),
      renameCondition: () => undefined,
      changeRole: (role, key) => roles.push(`${role}:${key}`),
      changeRun: (key, index) => runs.push(`${key}:${index}`),
      setOverlays: (value) => {
        overlays = typeof value === 'function' ? value(overlays) : value
      },
      onFilesChanged: () => undefined,
      onSelectionChanged: () => {
        selectionChanges += 1
      },
      onAssessmentSourceChanged: () => {
        assessmentChanges += 1
      },
      setBusy: () => undefined,
      appendNotices: () => undefined,
    })

    actions.removeHydraulicCondition('EX')
    actions.changeScenarioRole('assessment', 'PR')
    actions.changeScenarioRun('EX', 2)
    actions.updateOverlay('one', { visible: false })
    actions.removeOverlay('two')

    assert.deepEqual(removed, ['EX'])
    assert.deepEqual(roles, ['assessment:PR'])
    assert.deepEqual(runs, ['EX:2'])
    assert.equal(selectionChanges, 3)
    assert.equal(assessmentChanges, 3)
    assert.deepEqual(overlays.map(({ id, visible }) => ({ id, visible })), [
      { id: 'one', visible: false },
    ])
  })
})
