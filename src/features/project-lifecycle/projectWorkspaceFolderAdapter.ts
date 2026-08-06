import type {
  ProjectDirectoryReference,
  ProjectFolderStoragePort,
} from '../../application/ports/projectFolderStorage'
import type { HydraulicProjectWorkspaceEntry } from '../../core/projectFiles/hydraulicProjectManifest'

type WorkspaceFileContext = {
  storage: ProjectFolderStoragePort
  directory: ProjectDirectoryReference
  entry: HydraulicProjectWorkspaceEntry
}

export type ProjectWorkspaceFolderAdapter<State> = {
  workspaceId: string
  defaultEntry: HydraulicProjectWorkspaceEntry
  fingerprint(state: State): string
  write(context: WorkspaceFileContext & { state: State }): Promise<void>
  read(context: WorkspaceFileContext): Promise<State>
}

export type ProjectWorkspaceHydration = {
  workspaceId: string
  fingerprint: string
  apply(): void
}

export type ProjectWorkspaceFolderBinding = {
  workspaceId: string
  defaultEntry: HydraulicProjectWorkspaceEntry
  fingerprint: string
  write(context: WorkspaceFileContext): Promise<void>
  read(context: WorkspaceFileContext): Promise<ProjectWorkspaceHydration>
  reset(): ProjectWorkspaceHydration
}

type BindOptions<State> = {
  adapter: ProjectWorkspaceFolderAdapter<State>
  state: State
  hydrate(state: State): void
  createInitialState(): State
}

function hydration<State>(
  adapter: ProjectWorkspaceFolderAdapter<State>,
  state: State,
  hydrate: (state: State) => void,
): ProjectWorkspaceHydration {
  return {
    workspaceId: adapter.workspaceId,
    fingerprint: adapter.fingerprint(state),
    apply: () => hydrate(state),
  }
}

export function bindProjectWorkspace<State>({
  adapter,
  state,
  hydrate,
  createInitialState,
}: BindOptions<State>): ProjectWorkspaceFolderBinding {
  return {
    workspaceId: adapter.workspaceId,
    defaultEntry: adapter.defaultEntry,
    fingerprint: adapter.fingerprint(state),
    write: (context) => adapter.write({ ...context, state }),
    read: async (context) => hydration(adapter, await adapter.read(context), hydrate),
    reset: () => hydration(adapter, createInitialState(), hydrate),
  }
}

export function projectWorkspaceFingerprint(
  workspaces: Pick<ProjectWorkspaceFolderBinding, 'workspaceId' | 'fingerprint'>[],
) {
  return JSON.stringify(
    [...workspaces]
      .sort((left, right) => left.workspaceId.localeCompare(right.workspaceId))
      .map(({ workspaceId, fingerprint }) => [workspaceId, fingerprint]),
  )
}
