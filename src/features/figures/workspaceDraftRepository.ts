import type { WorkspaceDraftSnapshot } from '../../core/types'
import type { WorkspaceDraftModule } from './workspaceDraftModule'

export type StoredWorkspaceDraft = WorkspaceDraftSnapshot

export type WorkspaceDraftRepository = ReturnType<
  typeof createWorkspaceDraftRepository
>

export function createWorkspaceDraftSnapshot<WorkspaceId extends string, Draft>(
  module: WorkspaceDraftModule<WorkspaceId, Draft>,
  draft: Draft,
): WorkspaceDraftSnapshot {
  return {
    workspaceId: module.workspaceId,
    schemaVersion: module.schemaVersion,
    source: module.serializeDraft(draft),
  }
}

export function createWorkspaceDraftRepository(
  initialDrafts: readonly StoredWorkspaceDraft[] = [],
  onChange: () => void = () => undefined,
) {
  const drafts = new Map(
    initialDrafts.map((draft) => [draft.workspaceId, { ...draft }]),
  )
  let replacementGeneration = 0

  return {
    capture<WorkspaceId extends string, Draft>(
      module: WorkspaceDraftModule<WorkspaceId, Draft>,
      draft: Draft,
    ) {
      const stored = createWorkspaceDraftSnapshot(module, draft)
      const current = drafts.get(module.workspaceId)
      if (
        current?.schemaVersion === stored.schemaVersion &&
        current.source === stored.source
      ) return { ...current }
      drafts.set(module.workspaceId, stored)
      onChange()
      return { ...stored }
    },
    restore<WorkspaceId extends string, Draft>(
      module: WorkspaceDraftModule<WorkspaceId, Draft>,
    ): Draft | null {
      const stored = drafts.get(module.workspaceId)
      if (!stored) return null
      if (stored.schemaVersion !== module.schemaVersion) {
        throw new Error(
          `Workspace draft version ${stored.schemaVersion} is not supported by ${module.workspaceId}.`,
        )
      }
      return module.parseDraft(stored.source)
    },
    remove(workspaceId: string) {
      if (drafts.delete(workspaceId)) onChange()
    },
    clear() {
      if (drafts.size === 0) return
      drafts.clear()
      onChange()
    },
    replace(nextDrafts: readonly StoredWorkspaceDraft[]) {
      replacementGeneration += 1
      const next = new Map(
        nextDrafts.map((draft) => [draft.workspaceId, { ...draft }]),
      )
      const changed = next.size !== drafts.size || [...next].some(
        ([workspaceId, draft]) => {
          const current = drafts.get(workspaceId)
          return current?.schemaVersion !== draft.schemaVersion ||
            current.source !== draft.source
        },
      )
      if (!changed) return
      drafts.clear()
      next.forEach((draft, workspaceId) => drafts.set(workspaceId, draft))
      onChange()
    },
    replacementGeneration() {
      return replacementGeneration
    },
    entries() {
      return [...drafts.values()].map((draft) => ({ ...draft }))
    },
  }
}
