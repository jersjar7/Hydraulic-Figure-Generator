import type { WorkspaceDraftModule } from './workspaceDraftModule'

export type StoredWorkspaceDraft = {
  workspaceId: string
  schemaVersion: number
  source: string
}

export type WorkspaceDraftRepository = ReturnType<
  typeof createWorkspaceDraftRepository
>

export function createWorkspaceDraftRepository(
  initialDrafts: readonly StoredWorkspaceDraft[] = [],
) {
  const drafts = new Map(
    initialDrafts.map((draft) => [draft.workspaceId, { ...draft }]),
  )

  return {
    capture<WorkspaceId extends string, Draft>(
      module: WorkspaceDraftModule<WorkspaceId, Draft>,
      draft: Draft,
    ) {
      const stored: StoredWorkspaceDraft = {
        workspaceId: module.workspaceId,
        schemaVersion: module.schemaVersion,
        source: module.serializeDraft(draft),
      }
      drafts.set(module.workspaceId, stored)
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
      drafts.delete(workspaceId)
    },
    clear() {
      drafts.clear()
    },
    entries() {
      return [...drafts.values()].map((draft) => ({ ...draft }))
    },
  }
}
