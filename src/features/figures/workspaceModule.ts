import {
  lazy,
  type ComponentType,
} from 'react'
import type { WorkspaceDraftModule } from './workspaceDraftModule'

type WorkspaceComponentModule = {
  default: ComponentType
}

export type WorkspaceExtensionCapabilities = Readonly<{
  folderDraft: true
  editableExport: true
  inputRecovery: 'portable' | 'reselect-hydraulic-files'
  draftCompatibility:
    | Readonly<{ mode: 'current-only' }>
    | Readonly<{ mode: 'migrates-legacy'; oldestVersion: number }>
}>

export function defineFigureWorkspace<
  const Figure extends { id: string },
  Draft,
>({
  figure,
  capabilities,
  loadDraft,
  loadWorkspace,
}: {
  figure: Figure
  capabilities: WorkspaceExtensionCapabilities
  loadDraft: () => Promise<WorkspaceDraftModule<Figure['id'], Draft>>
  loadWorkspace: () => Promise<WorkspaceComponentModule>
}) {
  return {
    id: figure.id,
    figure,
    capabilities,
    draft: {
      workspaceId: figure.id,
      load: loadDraft,
    },
    Workspace: lazy(loadWorkspace),
  } as const
}
