import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import {
  FIGURE_WORKSPACES,
} from './workspaceRegistry'
import type { AppWorkspaceId } from '../project-workspace/hydraulicProjectWorkspaceContext'
import { REPORT_ASSEMBLY_WORKSPACE_ID } from '../report-assembly/reportAssemblyWorkspaceId'

export function FigurePicker() {
  const { activeFigureId, setActiveFigureId } =
    useHydraulicProjectWorkspace()
  const options = FIGURE_WORKSPACES.map((workspace) => ({
      id: workspace.id,
      label: workspace.figure.label,
    })).sort((left, right) => left.label.localeCompare(right.label))
  const selectedValue = activeFigureId === REPORT_ASSEMBLY_WORKSPACE_ID
    ? ''
    : activeFigureId
  return (
    <label className="figure-picker">
      <span className="visually-hidden">Workspace</span>
      <select
        aria-label="Workspace"
        value={selectedValue}
        onChange={(event) =>
          setActiveFigureId(event.currentTarget.value as AppWorkspaceId)
        }
      >
        {selectedValue === '' ? (
          <option value="" disabled>Choose figure workspace</option>
        ) : null}
        {options.map((option) => (
          <option value={option.id} key={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
