import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { defineWorkspaceDraftModule } from '../src/features/figures/workspaceDraftModule'
import {
  createWorkspaceDraftRepository,
  createWorkspaceDraftSnapshot,
} from '../src/features/figures/workspaceDraftRepository'

const draftModule = defineWorkspaceDraftModule({
  workspaceId: 'test-workspace',
  schemaVersion: 2,
  createInitialDraft: () => ({ title: 'Initial', count: 0 }),
  serializeDraft: JSON.stringify,
  parseDraft: (source: string) => {
    const parsed = JSON.parse(source) as { title?: unknown; count?: unknown }
    if (
      typeof parsed.title !== 'string' ||
      typeof parsed.count !== 'number'
    ) {
      throw new Error('Malformed test draft.')
    }
    return { title: parsed.title, count: parsed.count }
  },
})

describe('workspace draft repository', () => {
  it('creates an immutable serialized snapshot at a point in time', () => {
    const editable = { title: 'First', count: 1 }
    const first = createWorkspaceDraftSnapshot(draftModule, editable)
    editable.title = 'Second'
    const second = createWorkspaceDraftSnapshot(draftModule, editable)

    assert.deepEqual(JSON.parse(first.source), { title: 'First', count: 1 })
    assert.deepEqual(JSON.parse(second.source), { title: 'Second', count: 1 })
  })

  it('captures and restores a validated workspace-owned draft', () => {
    const repository = createWorkspaceDraftRepository()
    const draft = { title: 'Edited figure', count: 4 }

    assert.equal(repository.restore(draftModule), null)
    assert.deepEqual(repository.capture(draftModule, draft), {
      workspaceId: draftModule.workspaceId,
      schemaVersion: draftModule.schemaVersion,
      source: JSON.stringify(draft),
    })
    assert.deepEqual(repository.restore(draftModule), draft)
  })

  it('keeps workspace drafts isolated and replaces only the requested one', () => {
    const repository = createWorkspaceDraftRepository()
    const otherModule = defineWorkspaceDraftModule({
      workspaceId: 'other-workspace',
      schemaVersion: 1,
      createInitialDraft: () => ({ enabled: false }),
      serializeDraft: JSON.stringify,
      parseDraft: (source: string) => JSON.parse(source) as { enabled: boolean },
    })

    repository.capture(draftModule, { title: 'First', count: 1 })
    repository.capture(otherModule, { enabled: true })
    repository.capture(draftModule, { title: 'Second', count: 2 })

    assert.deepEqual(repository.restore(draftModule), {
      title: 'Second',
      count: 2,
    })
    assert.deepEqual(repository.restore(otherModule), { enabled: true })
    assert.equal(repository.entries().length, 2)
  })

  it('rejects incompatible versions and supports removal and reset', () => {
    const repository = createWorkspaceDraftRepository([{
      workspaceId: draftModule.workspaceId,
      schemaVersion: 1,
      source: JSON.stringify({ title: 'Old', count: 1 }),
    }])

    assert.throws(
      () => repository.restore(draftModule),
      /version 1 is not supported/,
    )
    repository.remove(draftModule.workspaceId)
    assert.equal(repository.restore(draftModule), null)
    repository.capture(draftModule, { title: 'Current', count: 3 })
    repository.clear()
    assert.deepEqual(repository.entries(), [])
  })

  it('notifies only for material changes and replaces a saved collection', () => {
    let changes = 0
    const repository = createWorkspaceDraftRepository([], () => { changes += 1 })
    const current = { title: 'Current', count: 3 }

    repository.capture(draftModule, current)
    repository.capture(draftModule, current)
    assert.equal(changes, 1)

    repository.replace([createWorkspaceDraftSnapshot(draftModule, {
      title: 'Restored',
      count: 8,
    })])
    assert.equal(changes, 2)
    assert.deepEqual(repository.restore(draftModule), {
      title: 'Restored',
      count: 8,
    })
  })
})
