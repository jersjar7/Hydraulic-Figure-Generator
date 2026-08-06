import { ProjectStartDialog } from '../project-lifecycle/ProjectStartDialog'
import { useHydraulicProjectWorkspace } from './useHydraulicProjectWorkspace'

export function ProjectLifecycleGate() {
  const { projectLifecycle } = useHydraulicProjectWorkspace()

  return (
    <ProjectStartDialog
      mode={projectLifecycle.dialog}
      supported={projectLifecycle.isSupported}
      busy={projectLifecycle.busy}
      error={projectLifecycle.error}
      onNew={projectLifecycle.requestNewProject}
      onCreate={projectLifecycle.createProject}
      onOpen={projectLifecycle.openProject}
      onContinue={projectLifecycle.dismissDialog}
      onBack={projectLifecycle.backToWelcome}
    />
  )
}
