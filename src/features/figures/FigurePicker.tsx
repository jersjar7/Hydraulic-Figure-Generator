import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import {
  FIGURE_WORKSPACES,
} from './workspaceRegistry'
import type { AppWorkspaceId } from '../project-workspace/hydraulicProjectWorkspaceContext'
import { REPORT_ASSEMBLY_WORKSPACE_ID } from '../report-assembly/reportAssemblyWorkspaceId'

export function FigurePicker() {
  const { activeFigureId, setActiveFigureId, reportAssembly } =
    useHydraulicProjectWorkspace()
  return (
    <label className="figure-picker">
      <span className="visually-hidden">Workspace</span>
      <select
        aria-label="Workspace"
        value={activeFigureId}
        onChange={(event) =>
          setActiveFigureId(event.currentTarget.value as AppWorkspaceId)
        }
      >
        {FIGURE_WORKSPACES.map((workspace) => (
          <option value={workspace.id} key={workspace.id}>
            {workspace.figure.label}
          </option>
        ))}
        <option value={REPORT_ASSEMBLY_WORKSPACE_ID}>
          Export Collection ({reportAssembly.figureCount})
        </option>
      </select>
    </label>
  )
}
