export type WorkspaceDraftModule<
  WorkspaceId extends string,
  Draft,
> = {
  workspaceId: WorkspaceId
  schemaVersion: number
  createInitialDraft(): Draft
  serializeDraft(draft: Draft): string
  parseDraft(source: string): Draft
}

export function defineWorkspaceDraftModule<
  const WorkspaceId extends string,
  Draft,
>(module: WorkspaceDraftModule<WorkspaceId, Draft>) {
  return module
}
