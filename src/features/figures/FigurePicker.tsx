import type { FigureId } from '../../core/figureIds'
import { useHydraulicProjectWorkspace } from '../project-workspace/HydraulicProjectWorkspaceProvider'
import { FIGURE_MODULES } from './registry'

export function FigurePicker() {
  const { activeFigureId, setActiveFigureId } =
    useHydraulicProjectWorkspace()
  return (
    <label className="figure-picker">
      <span className="visually-hidden">Figure type</span>
      <select
        aria-label="Figure type"
        value={activeFigureId}
        onChange={(event) =>
          setActiveFigureId(event.currentTarget.value as FigureId)
        }
      >
        {FIGURE_MODULES.map((figure) => (
          <option value={figure.id} key={figure.id}>
            {figure.label}
          </option>
        ))}
      </select>
    </label>
  )
}
