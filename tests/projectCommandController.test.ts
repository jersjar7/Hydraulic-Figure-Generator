import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createProjectCommandController,
  type ProjectCommandNotice,
} from '../src/features/project-lifecycle/projectCommandController'

function createHarness(overrides: Partial<{
  saveProject(): Promise<boolean>
  openProject(): Promise<boolean>
  requestNewProject(): void
  confirmDiscard(): boolean
}> = {}) {
  const notices: Array<ProjectCommandNotice | null> = []
  let newRequests = 0
  const controller = createProjectCommandController({
    lifecycle: {
      saveProject: async () => true,
      openProject: async () => true,
      requestNewProject: () => { newRequests += 1 },
      confirmDiscard: () => true,
      ...overrides,
    },
    setNotice: (notice) => notices.push(notice),
  })
  return { controller, notices, newRequests: () => newRequests }
}

test('shared project commands report successful folder saves and opens', async () => {
  const harness = createHarness()

  assert.equal(await harness.controller.saveProject(), true)
  assert.deepEqual(harness.notices.at(-1), {
    level: 'success',
    text: 'Project folder saved.',
  })

  assert.equal(await harness.controller.openProject(), true)
  assert.deepEqual(harness.notices.at(-1), {
    level: 'success',
    text: 'Project folder opened.',
  })
})

test('shared project commands normalize save failures without throwing', async () => {
  const harness = createHarness({
    saveProject: async () => { throw new Error('Disk is unavailable') },
  })

  assert.equal(await harness.controller.saveProject(), false)
  assert.deepEqual(harness.notices.at(-1), {
    level: 'error',
    text: 'Project save failed: Disk is unavailable',
  })
})

test('workspace reset runs only after unsaved changes are accepted', () => {
  let resets = 0
  const blocked = createHarness({ confirmDiscard: () => false })
  assert.equal(
    blocked.controller.confirmWorkspaceReset(() => { resets += 1 }),
    false,
  )
  assert.equal(resets, 0)

  const accepted = createHarness({ confirmDiscard: () => true })
  assert.equal(
    accepted.controller.confirmWorkspaceReset(() => { resets += 1 }),
    true,
  )
  assert.equal(resets, 1)
})

test('new project requests clear stale command notices', () => {
  const harness = createHarness()

  harness.controller.requestNewProject()

  assert.equal(harness.newRequests(), 1)
  assert.equal(harness.notices.at(-1), null)
})
