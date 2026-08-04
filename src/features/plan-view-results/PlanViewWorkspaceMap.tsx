import type { RefObject } from 'react'
import type { PlanViewResultScene } from '../../core/types'
import type { FigureProductionMode } from '../figure-sets/FigureProductionModeSwitcher'
import type { CanvasDisplaySize } from '../figures/useFittedCanvasAspect'
import { PlanViewFigureSetGallery } from './PlanViewFigureSetGallery'
import { PlanViewResultCanvas } from './PlanViewResultCanvas'
import type { usePlanViewFigureSet } from './usePlanViewFigureSet'

type Props = {
  mode: FigureProductionMode
  scene: PlanViewResultScene | null
  ready: boolean
  busy: boolean
  canvasRef: RefObject<HTMLCanvasElement | null>
  canvasFrameRef: RefObject<HTMLDivElement | null>
  displaySize: CanvasDisplaySize
  figureSet: ReturnType<typeof usePlanViewFigureSet>
  onGenerate(): void
  onOpenFigure(
    item: ReturnType<typeof usePlanViewFigureSet>['figureSet']['items'][number],
  ): void
}

export function PlanViewWorkspaceMap({
  mode,
  scene,
  ready,
  busy,
  canvasRef,
  canvasFrameRef,
  displaySize,
  figureSet,
  onGenerate,
  onOpenFigure,
}: Props) {
  if (mode === 'set') {
    return (
      <PlanViewFigureSetGallery
        figureSet={figureSet.figureSet}
        runtime={figureSet.runtime}
        draftCount={figureSet.draftCount}
        onOpen={onOpenFigure}
        onToggleIncluded={figureSet.toggleIncluded}
      />
    )
  }
  return (
    <PlanViewResultCanvas
      scene={scene}
      ready={ready}
      busy={busy}
      canvasRef={canvasRef}
      canvasFrameRef={canvasFrameRef}
      displaySize={displaySize}
      onGenerate={onGenerate}
    />
  )
}
