import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { crossSectionWorkspaceDraft } from '../src/features/cross-section/crossSectionWorkspaceDraft'
import type { WorkspaceDraftModule } from '../src/features/figures/workspaceDraftModule'
import { hydraulicProfileWorkspaceDraft } from '../src/features/hydraulic-profiles/hydraulicProfileWorkspaceDraft'
import { planViewResultWorkspaceDraft } from '../src/features/plan-view-results/planViewResultWorkspaceDraft'
import { wseWorkspaceDraft } from '../src/features/wse-difference/wseWorkspaceDraft'

function assertDraftRoundTrip<WorkspaceId extends string, Draft>(
  module: WorkspaceDraftModule<WorkspaceId, Draft>,
) {
  const serialized = module.serializeDraft(module.createInitialDraft())
  const restored = module.parseDraft(serialized)
  assert.deepEqual(
    module.parseDraft(module.serializeDraft(restored)),
    restored,
  )
  assert.throws(() => module.parseDraft('not-json'))
}

describe('workspace draft modules', () => {
  it('round-trips and validates every current figure workspace draft', () => {
    assertDraftRoundTrip(wseWorkspaceDraft)
    assertDraftRoundTrip(crossSectionWorkspaceDraft)
    assertDraftRoundTrip(planViewResultWorkspaceDraft)
    assertDraftRoundTrip(hydraulicProfileWorkspaceDraft)
  })
})
