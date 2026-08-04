import { AlertCircle, Download, LayoutGrid, Map, X } from 'lucide-react'
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
      <div className="generate-bar">
        <button
          className={`button ${figureDocument.exporting ? 'secondary' : 'primary'} full`}
          type="button"
          disabled={!figureDocument.exporting && figureDocument.pages.length === 0}
          data-testid="export-figure-document"
          onClick={() => {
            if (figureDocument.exporting) figureDocument.cancelExport()
            else void figureDocument.exportWord()
          }}
        >
          {figureDocument.exporting ? (
            <><X size={17} aria-hidden="true" /> Cancel export ({completed}/{total})</>
          ) : (
            <><Download size={17} aria-hidden="true" /> Export Word document</>
          )}
        </button>
      </div>
    )
  }
  if (mode === 'set') {
    return (
      <div className="generate-bar">
        <button
          className={`button ${figureSet.generating ? 'secondary' : 'primary'} full`}
          type="button"
          disabled={!figureSet.generating && figureSet.draftCount === 0}
          data-testid="generate-figure-set"
          onClick={() => {
            if (figureSet.generating) figureSet.cancel()
            else void figureSet.generate()
          }}
        >
          {figureSet.generating ? (
            <><X size={17} aria-hidden="true" /> Cancel generation</>
          ) : (
            <><LayoutGrid size={17} aria-hidden="true" /> Generate figure set</>
          )}
        </button>
      </div>
    )
  }
  return (
    <div className="generate-bar">
      <button
        className="button primary full"
        type="button"
        disabled={!ready || busy}
        data-testid="generate-plan-view"
        onClick={onGenerateFigure}
      >
        <Map size={18} aria-hidden="true" />
        {scene ? 'Regenerate map' : 'Generate map'}
      </button>
      {!ready ? (
        <span className="generate-hint">
          <AlertCircle size={14} aria-hidden="true" />
          Add one complete SMS scenario first
        </span>
      ) : null}
    </div>
  )
}
