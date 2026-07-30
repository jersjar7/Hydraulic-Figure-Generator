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
  return <Workspace />
}

function App() {
  return (
    <HydraulicProjectWorkspaceProvider>
      <ActiveWorkspace />
    </HydraulicProjectWorkspaceProvider>
  )
}

export default App
