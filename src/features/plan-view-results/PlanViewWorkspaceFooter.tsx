import { Download, LayoutGrid, Map, X } from 'lucide-react'
import { WorkspaceActionBar } from '../../components/settings/WorkspaceActionBar'
import type { PlanViewResultScene } from '../../core/types'
import type { FigureProductionMode } from '../figure-sets/FigureProductionModeSwitcher'
import type { usePlanViewFigureSet } from './usePlanViewFigureSet'
import type { usePlanViewFigureDocument } from './usePlanViewFigureDocument'

type Props = {
  mode: FigureProductionMode
  ready: boolean
  busy: boolean
  scene: PlanViewResultScene | null
  figureSet: ReturnType<typeof usePlanViewFigureSet>
  figureDocument: ReturnType<typeof usePlanViewFigureDocument>
  onGenerateFigure(): void
}

export function PlanViewWorkspaceFooter({
  mode,
  ready,
  busy,
  scene,
  figureSet,
  figureDocument,
  onGenerateFigure,
}: Props) {
  if (mode === 'document') {
    const { completed, total } = figureDocument.progress
    return (
      <WorkspaceActionBar
        icon={figureDocument.exporting
          ? <X size={17} aria-hidden="true" />
          : <Download size={17} aria-hidden="true" />}
        label={figureDocument.exporting
          ? `Cancel export (${completed}/${total})`
          : 'Export quick Word document'}
        tone={figureDocument.exporting ? 'secondary' : 'primary'}
        disabled={!figureDocument.exporting && figureDocument.pages.length === 0}
        testId="export-figure-document"
        onClick={() => {
          if (figureDocument.exporting) figureDocument.cancelExport()
          else void figureDocument.exportWord()
        }}
      />
    )
  }
  if (mode === 'set') {
    return (
      <WorkspaceActionBar
        icon={figureSet.generating
          ? <X size={17} aria-hidden="true" />
          : <LayoutGrid size={17} aria-hidden="true" />}
        label={figureSet.generating ? 'Cancel generation' : 'Generate batch figures'}
        tone={figureSet.generating ? 'secondary' : 'primary'}
        disabled={!figureSet.generating && figureSet.draftCount === 0}
        testId="generate-figure-set"
        onClick={() => {
          if (figureSet.generating) figureSet.cancel()
          else void figureSet.generate()
        }}
      />
    )
  }
  return (
    <WorkspaceActionBar
      icon={<Map size={18} aria-hidden="true" />}
      label={scene ? 'Regenerate map' : 'Generate map'}
      disabled={!ready || busy}
      testId="generate-plan-view"
      hint={!ready ? 'Add one complete SMS scenario first' : undefined}
      onClick={onGenerateFigure}
    />
  )
}
