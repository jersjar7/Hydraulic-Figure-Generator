import { FilePlus2, FolderOpen, Save } from 'lucide-react'
import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import { ProjectSaveStatus } from './ProjectSaveStatus'

export function ProjectCommandBar() {
  const { projectLifecycle, projectCommands } = useHydraulicProjectWorkspace()

  return (
    <>
      <ProjectSaveStatus
        projectName={projectLifecycle.projectName}
        dirty={projectLifecycle.isDirty}
        error={projectLifecycle.error}
        notice={projectCommands.notice?.text}
      />
      <button
        className="button secondary compact"
        type="button"
        disabled={projectLifecycle.busy}
        onClick={projectCommands.requestNewProject}
      >
        <FilePlus2 size={16} aria-hidden="true" />
        <span>New project</span>
      </button>
      <button
        className="button secondary compact"
        type="button"
        disabled={projectLifecycle.busy}
        onClick={() => void projectCommands.saveProject()}
      >
        <Save size={16} aria-hidden="true" />
        <span>Save project</span>
      </button>
      <button
        className="button secondary compact"
        type="button"
        disabled={projectLifecycle.busy}
        onClick={() => void projectCommands.openProject()}
      >
        <FolderOpen size={16} aria-hidden="true" />
        <span>Open project</span>
      </button>
      {projectCommands.notice ? (
        <span className="visually-hidden" role="status">
          {projectCommands.notice.text}
        </span>
      ) : null}
    </>
  )
}
