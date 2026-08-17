import {
  Download,
  FileOutput,
  Images,
  LayoutGrid,
  Map,
  X,
} from 'lucide-react'
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
  batchExport: {
    includedCount: number
    adding: boolean
    progress: { completed: number; total: number }
    onAdd(): void
    onCancel(): void
    onQuickWord(): void
  }
}

export function PlanViewWorkspaceFooter({
  mode,
  ready,
  busy,
  scene,
  figureSet,
  figureDocument,
  onGenerateFigure,
  batchExport,
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
      <div className="generate-bar workspace-action-bar batch-action-footer">
        <button
          className={`button ${figureSet.generating ? 'secondary' : 'primary'} full workspace-primary-action`}
          type="button"
          disabled={!figureSet.generating && figureSet.draftCount === 0}
          data-testid="generate-figure-set"
          onClick={() => {
            if (figureSet.generating) figureSet.cancel()
            else void figureSet.generate()
          }}
        >
          {figureSet.generating
            ? <X size={17} aria-hidden="true" />
            : <LayoutGrid size={17} aria-hidden="true" />}
          <span>
            {figureSet.generating
              ? 'Cancel generation'
              : figureSet.figureSet.items.length > 0
                ? 'Regenerate batch figures'
                : 'Generate batch figures'}
          </span>
        </button>
        <div className="batch-action-footer-exports">
          <button
            className="button secondary compact"
            type="button"
            aria-label={batchExport.adding
              ? `Cancel Export Collection transfer (${batchExport.progress.completed}/${batchExport.progress.total})`
              : `Add included to Export Collection (${batchExport.includedCount})`}
            disabled={batchExport.includedCount === 0 && !batchExport.adding}
            onClick={batchExport.adding ? batchExport.onCancel : batchExport.onAdd}
          >
            {batchExport.adding
              ? <X size={15} aria-hidden="true" />
              : <Images size={15} aria-hidden="true" />}
            <span>
              {batchExport.adding
                ? `Cancel (${batchExport.progress.completed}/${batchExport.progress.total})`
                : `Add to Collection (${batchExport.includedCount})`}
            </span>
          </button>
          <button
            className="button secondary compact"
            type="button"
            disabled={batchExport.includedCount === 0 || batchExport.adding}
            onClick={batchExport.onQuickWord}
          >
            <FileOutput size={15} aria-hidden="true" />
            <span>Quick Word Export</span>
          </button>
        </div>
      </div>
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
