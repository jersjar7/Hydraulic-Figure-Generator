import { ArrowRight } from 'lucide-react'
import { FigureEditorShell } from '../../components/editor/FigureEditorShell'
import { FIGURE_WORKSPACES } from '../figures/workspaceRegistry'
import { useHydraulicProjectWorkspace } from './useHydraulicProjectWorkspace'

export function ProjectWorkspaceStart() {
  const { setActiveFigureId } = useHydraulicProjectWorkspace()
  const workspaces = [...FIGURE_WORKSPACES].sort((left, right) =>
    left.figure.label.localeCompare(right.figure.label),
  )

  return (
    <FigureEditorShell
      inputsCollapsed={false}
      leftPanelOpen={false}
      rightPanelOpen={false}
      onOpenLeftPanel={() => undefined}
      onOpenRightPanel={() => undefined}
      onCloseMobilePanels={() => undefined}
      workspaceClassName="project-workspace-start"
      showPanelButtons={false}
    >
      <section className="workspace-start-content" aria-labelledby="workspace-start-title">
        <header>
          <span className="eyebrow">Project workspace</span>
          <h2 id="workspace-start-title">Choose a workspace</h2>
          <p>Select the figure workflow needed for this project.</p>
        </header>
        <div className="workspace-start-options">
          {workspaces.map((workspace) => {
            const Icon = workspace.icon
            return (
              <button
                className="workspace-start-option"
                type="button"
                key={workspace.id}
                aria-label={`Open ${workspace.figure.label}`}
                onClick={() => setActiveFigureId(workspace.id)}
              >
                <span className="workspace-start-icon" aria-hidden="true">
                  <Icon size={24} />
                </span>
                <span>
                  <strong>{workspace.figure.label}</strong>
                  <small>{workspace.figure.description}</small>
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </section>
    </FigureEditorShell>
  )
}
