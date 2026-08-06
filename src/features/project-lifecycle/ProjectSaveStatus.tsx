import { CircleCheck, CircleDotDashed } from 'lucide-react'

type Props = {
  projectName: string
  dirty: boolean
  error?: string
}

export function ProjectSaveStatus({ projectName, dirty, error = '' }: Props) {
  const label = error
    ? 'Save failed'
    : dirty
      ? projectName ? 'Unsaved changes' : 'Unsaved work'
      : projectName ? 'Saved' : 'No project'
  return (
    <div
      className={`project-save-status${dirty ? ' is-dirty' : ''}${error ? ' has-error' : ''}`}
      title={error || `${projectName || 'No project'} · ${label}`}
      aria-label={`${projectName || 'No project'}: ${label}`}
    >
      {dirty || error
        ? <CircleDotDashed size={15} aria-hidden="true" />
        : <CircleCheck size={15} aria-hidden="true" />}
      <span className="project-save-name">{projectName || 'No project'}</span>
      <span className="project-save-label">{label}</span>
    </div>
  )
}
