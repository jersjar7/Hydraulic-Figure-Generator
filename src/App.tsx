import { Suspense } from 'react'
import { FIGURE_WORKSPACES } from './features/figures/workspaceRegistry'
import {
  HydraulicProjectWorkspaceProvider,
} from './features/project-workspace/HydraulicProjectWorkspaceProvider'
import { useHydraulicProjectWorkspace } from './features/project-workspace/useHydraulicProjectWorkspace'

function ActiveWorkspace() {
  const { activeFigureId } = useHydraulicProjectWorkspace()
  const definition =
    FIGURE_WORKSPACES.find((workspace) => workspace.id === activeFigureId) ??
    FIGURE_WORKSPACES[0]
  const Workspace = definition.Workspace
  return (
    <Suspense
      fallback={
        <div className="workspace-loading" role="status">
          Loading figure workspace…
        </div>
      }
    >
      <Workspace />
    </Suspense>
  )
}

function App() {
  return (
    <HydraulicProjectWorkspaceProvider>
      <ActiveWorkspace />
    </HydraulicProjectWorkspaceProvider>
  )
}

export default App
