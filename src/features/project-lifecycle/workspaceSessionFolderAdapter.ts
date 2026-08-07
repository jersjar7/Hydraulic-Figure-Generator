import {
  parseWorkspaceSessionProject,
  serializeWorkspaceSessionProject,
  type WorkspaceSessionProjectState,
} from './workspaceSessionProjectFile'
import type { ProjectWorkspaceFolderAdapter } from './projectWorkspaceFolderAdapter'

export const WORKSPACE_SESSION_ID = 'workspace-session'

export const workspaceSessionFolderAdapter:
  ProjectWorkspaceFolderAdapter<WorkspaceSessionProjectState> = {
    workspaceId: WORKSPACE_SESSION_ID,
    defaultEntry: {
      documentPath: 'workspaces/workspace-session.hfg.json',
      inputPaths: {},
    },
    fingerprint: serializeWorkspaceSessionProject,
    write: async ({ storage, directory, entry, state }) => {
      await storage.writeText(
        directory,
        entry.documentPath,
        serializeWorkspaceSessionProject(state),
      )
    },
    read: async ({ storage, directory, entry }) =>
      parseWorkspaceSessionProject(
        await storage.readText(directory, entry.documentPath),
      ),
  }
