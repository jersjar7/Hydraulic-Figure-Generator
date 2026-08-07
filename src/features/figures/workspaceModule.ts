import {
  lazy,
  type ComponentType,
} from 'react'
import type { WorkspaceDraftModule } from './workspaceDraftModule'

type WorkspaceComponentModule = {
  default: ComponentType
}

export function defineFigureWorkspace<
  const Figure extends { id: string },
  Draft,
>(
  figure: Figure,
  loadDraft: () => Promise<WorkspaceDraftModule<Figure['id'], Draft>>,
  load: () => Promise<WorkspaceComponentModule>,
) {
  return {
    id: figure.id,
    figure,
    draft: {
      workspaceId: figure.id,
      load: loadDraft,
    },
    Workspace: lazy(load),
  } as const
}
