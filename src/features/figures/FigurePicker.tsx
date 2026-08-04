import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import {
  FIGURE_WORKSPACES,
  type FigureId,
} from './workspaceRegistry'

export function FigurePicker() {
  const { activeFigureId, setActiveFigureId } =
    useHydraulicProjectWorkspace()
  return (
    <label className="figure-picker">
      <span className="visually-hidden">Workspace</span>
      <select
        aria-label="Workspace"
        value={activeFigureId}
        onChange={(event) =>
          setActiveFigureId(event.currentTarget.value as FigureId)
        }
      >
        {FIGURE_WORKSPACES.map((workspace) => (
          <option value={workspace.id} key={workspace.id}>
            {workspace.figure.label}
          </option>
        ))}
      </select>
    </label>
  )
}
