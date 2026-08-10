import { Images } from 'lucide-react'
import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import { REPORT_ASSEMBLY_WORKSPACE_ID } from './reportAssemblyWorkspaceId'

export function ExportCollectionButton() {
  const { activeFigureId, reportAssembly, setActiveFigureId } =
    useHydraulicProjectWorkspace()
  const active = activeFigureId === REPORT_ASSEMBLY_WORKSPACE_ID

  return (
    <button
      className={`button secondary compact export-collection-button${active ? ' active' : ''}`}
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={() => setActiveFigureId(REPORT_ASSEMBLY_WORKSPACE_ID)}
    >
      <Images size={16} aria-hidden="true" />
      <span>Export Collection ({reportAssembly.figureCount})</span>
    </button>
  )
}
