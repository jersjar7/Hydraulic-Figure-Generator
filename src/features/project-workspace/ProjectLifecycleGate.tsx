import { ProjectStartDialog } from '../project-lifecycle/ProjectStartDialog'
import { useHydraulicProjectWorkspace } from './useHydraulicProjectWorkspace'

export function ProjectLifecycleGate() {
  const { projectLifecycle, projectCommands } = useHydraulicProjectWorkspace()

  return (
    <ProjectStartDialog
      mode={projectLifecycle.dialog}
      supported={projectLifecycle.isSupported}
      busy={projectLifecycle.busy}
      error={projectLifecycle.error}
      onNew={projectCommands.requestNewProject}
      onCreate={projectLifecycle.createProject}
      onOpen={projectCommands.openProject}
      onContinue={projectLifecycle.dismissDialog}
      onBack={projectLifecycle.backToWelcome}
    />
  )
}
