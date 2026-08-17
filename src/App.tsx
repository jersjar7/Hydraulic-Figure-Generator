import { lazy, Suspense } from 'react'
import './App.css'
import { EditorHeaderNavigationProvider } from './components/editor/EditorHeaderNavigation'
import { FigurePicker } from './features/figures/FigurePicker'
import { FIGURE_WORKSPACES } from './features/figures/workspaceRegistry'
import {
  HydraulicProjectWorkspaceProvider,
} from './features/project-workspace/HydraulicProjectWorkspaceProvider'
import { ProjectLifecycleGate } from './features/project-workspace/ProjectLifecycleGate'
import { useHydraulicProjectWorkspace } from './features/project-workspace/useHydraulicProjectWorkspace'
import { REPORT_ASSEMBLY_WORKSPACE_ID } from './features/report-assembly/reportAssemblyWorkspaceId'
import { ExportCollectionButton } from './features/report-assembly/ExportCollectionButton'
import { ProjectCommandBar } from './features/project-lifecycle/ProjectCommandBar'
import { ProjectWorkspaceStart } from './features/project-workspace/ProjectWorkspaceStart'
import { PROJECT_START_WORKSPACE_ID } from './features/project-workspace/projectStartWorkspaceId'

const ReportAssemblyWorkspace = lazy(() =>
  import('./features/report-assembly/ReportAssemblyWorkspace').then((module) => ({
    default: module.ReportAssemblyWorkspace,
  })),
)

function ActiveWorkspace() {
  const { activeFigureId } = useHydraulicProjectWorkspace()
  if (activeFigureId === PROJECT_START_WORKSPACE_ID) {
    return <ProjectWorkspaceStart />
  }
  if (activeFigureId === REPORT_ASSEMBLY_WORKSPACE_ID) {
    return (
      <Suspense fallback={<div className="workspace-loading" role="status">Loading Export Collection…</div>}>
        <ReportAssemblyWorkspace />
      </Suspense>
    )
  }
  const definition =
    FIGURE_WORKSPACES.find((workspace) => workspace.id === activeFigureId)
  if (!definition) return <ProjectWorkspaceStart />
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
    <EditorHeaderNavigationProvider
      workspacePicker={<FigurePicker />}
      actions={<><ProjectCommandBar /><ExportCollectionButton /></>}
    >
      {projectLifecycle.dialog
        ? <div className="project-start-surface" aria-hidden="true" />
        : <ActiveWorkspace key={projectLifecycle.hydrationRevision} />}
      <ProjectLifecycleGate />
    </EditorHeaderNavigationProvider>
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
