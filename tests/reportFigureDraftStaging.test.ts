import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ReportFigureArtifact } from '../src/core/types'
import type { WorkspaceDraftModule } from '../src/features/figures/workspaceDraftModule'
import {
  createWorkspaceDraftRepository,
  createWorkspaceDraftSnapshot,
} from '../src/features/figures/workspaceDraftRepository'
import { FIGURE_WORKSPACES } from '../src/features/figures/workspaceRegistry'
import { stageReportFigureDraft } from '../src/features/project-workspace/stageReportFigureDraft'

function figure(
  workspaceId: string,
  workspaceLabel: string,
  workspaceDraft: ReportFigureArtifact['workspaceDraft'],
): ReportFigureArtifact {
  return {
    id: `figure-${workspaceId}`,
    workspaceId,
    workspaceLabel,
    title: `${workspaceLabel} figure`,
    caption: 'Hydraulic figure.',
    imageDataUrl: 'data:image/png;base64,AA==',
    widthPx: 1200,
    heightPx: 900,
    createdAt: '2026-08-07T12:00:00.000Z',
    workspaceDraft,
  }
}

describe('report figure draft staging', () => {
  it('stages a validated editable draft for every registered workspace', async () => {
    for (const workspace of FIGURE_WORKSPACES) {
      const module = await workspace.draft.load() as WorkspaceDraftModule<
        typeof workspace.id,
        unknown
      >
      const draft = module.createInitialDraft()
      const snapshot = createWorkspaceDraftSnapshot(module, draft)
      const repository = createWorkspaceDraftRepository()

      assert.equal(
        await stageReportFigureDraft(
          figure(workspace.id, workspace.figure.label, snapshot),
          repository,
        ),
        workspace.id,
      )
      assert.deepEqual(repository.restore(module), module.parseDraft(snapshot.source))
    }
  })

  it('rejects legacy and incompatible drafts without replacing current work', async () => {
    const workspace = FIGURE_WORKSPACES[0]
    const module = await workspace.draft.load()
    const repository = createWorkspaceDraftRepository()
    repository.capture(module, module.createInitialDraft())
    const before = repository.entries()

    await assert.rejects(
      stageReportFigureDraft(
        figure(workspace.id, workspace.figure.label, null),
        repository,
      ),
      /legacy figure/,
    )
    const incompatible = createWorkspaceDraftSnapshot(
      module,
      module.createInitialDraft(),
    )
    await assert.rejects(
      stageReportFigureDraft(
        figure(workspace.id, workspace.figure.label, {
          ...incompatible,
          schemaVersion: incompatible.schemaVersion + 1,
        }),
        repository,
      ),
      /version .* is required/,
    )
    assert.deepEqual(repository.entries(), before)
  })

  it('rejects malformed source without replacing current work', async () => {
    const workspace = FIGURE_WORKSPACES[0]
    const module = await workspace.draft.load()
    const repository = createWorkspaceDraftRepository()
    repository.capture(module, module.createInitialDraft())
    const before = repository.entries()

    await assert.rejects(
      stageReportFigureDraft(
        figure(workspace.id, workspace.figure.label, {
          workspaceId: workspace.id,
          schemaVersion: module.schemaVersion,
          source: '{malformed',
        }),
        repository,
      ),
      /saved .* draft is invalid/,
    )
    assert.deepEqual(repository.entries(), before)
  })
})
