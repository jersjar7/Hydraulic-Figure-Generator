import {
  lazy,
  type ComponentType,
} from 'react'

type WorkspaceComponentModule = {
  default: ComponentType
}

export function defineFigureWorkspace<
  const Figure extends { id: string },
>(
  figure: Figure,
  load: () => Promise<WorkspaceComponentModule>,
) {
  return {
    id: figure.id,
    figure,
    Workspace: lazy(load),
  } as const
}
