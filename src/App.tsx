import { lazy, Suspense } from 'react'
import './App.css'
import { FIGURE_WORKSPACES } from './features/figures/workspaceRegistry'
import {
  HydraulicProjectWorkspaceProvider,
} from './features/project-workspace/HydraulicProjectWorkspaceProvider'
import { ProjectLifecycleGate } from './features/project-workspace/ProjectLifecycleGate'
import { useHydraulicProjectWorkspace } from './features/project-workspace/useHydraulicProjectWorkspace'
import { REPORT_ASSEMBLY_WORKSPACE_ID } from './features/report-assembly/reportAssemblyWorkspaceId'

const ReportAssemblyWorkspace = lazy(() =>
  import('./features/report-assembly/ReportAssemblyWorkspace').then((module) => ({
    default: module.ReportAssemblyWorkspace,
  })),
)

function ActiveWorkspace() {
  const { activeFigureId } = useHydraulicProjectWorkspace()
  if (activeFigureId === REPORT_ASSEMBLY_WORKSPACE_ID) {
    return (
      <Suspense fallback={<div className="workspace-loading" role="status">Loading Export Collection…</div>}>
        <ReportAssemblyWorkspace />
      </Suspense>
    )
  }
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

function ProjectApplication() {
  const { projectLifecycle } = useHydraulicProjectWorkspace()
  return (
    <>
      {projectLifecycle.dialog
        ? <div className="project-start-surface" aria-hidden="true" />
        : <ActiveWorkspace />}
      <ProjectLifecycleGate />
    </>
  )
}

function App() {
  return (
    <HydraulicProjectWorkspaceProvider>
      <ProjectApplication />
    </HydraulicProjectWorkspaceProvider>
  )
}

export default App
