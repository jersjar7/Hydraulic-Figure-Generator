import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import {
  FIGURE_WORKSPACES,
} from './workspaceRegistry'
import type { AppWorkspaceId } from '../project-workspace/hydraulicProjectWorkspaceContext'
import { REPORT_ASSEMBLY_WORKSPACE_ID } from '../report-assembly/reportAssemblyWorkspaceId'

export function FigurePicker() {
  const { activeFigureId, setActiveFigureId, reportAssembly } =
    useHydraulicProjectWorkspace()
  const options = [
    ...FIGURE_WORKSPACES.map((workspace) => ({
      id: workspace.id,
      label: workspace.figure.label,
    })),
    {
      id: REPORT_ASSEMBLY_WORKSPACE_ID,
      label: `Export Collection (${reportAssembly.figureCount})`,
    },
  ].sort((left, right) => left.label.localeCompare(right.label))
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
        {options.map((option) => (
          <option value={option.id} key={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
