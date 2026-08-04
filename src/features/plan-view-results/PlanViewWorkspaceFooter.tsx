import { AlertCircle, LayoutGrid, Map, X } from 'lucide-react'
import type { PlanViewResultScene } from '../../core/types'
import type { FigureProductionMode } from '../figure-sets/FigureProductionModeSwitcher'
import type { usePlanViewFigureSet } from './usePlanViewFigureSet'

type Props = {
  mode: FigureProductionMode
  ready: boolean
  busy: boolean
  scene: PlanViewResultScene | null
  figureSet: ReturnType<typeof usePlanViewFigureSet>
  onGenerateFigure(): void
}

export function PlanViewWorkspaceFooter({
  mode,
  ready,
  busy,
  scene,
  figureSet,
  onGenerateFigure,
}: Props) {
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
