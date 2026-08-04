import type { RefObject } from 'react'
import type { PlanViewResultScene } from '../../core/types'
import type { FigureProductionMode } from '../figure-sets/FigureProductionModeSwitcher'
import type { CanvasDisplaySize } from '../figures/useFittedCanvasAspect'
import { PlanViewFigureSetGallery } from './PlanViewFigureSetGallery'
import { PlanViewFigureDocumentPreview } from './PlanViewFigureDocumentPreview'
import { PlanViewResultCanvas } from './PlanViewResultCanvas'
import type { usePlanViewFigureDocument } from './usePlanViewFigureDocument'
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
  figureDocument: ReturnType<typeof usePlanViewFigureDocument>
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
  figureDocument,
  onGenerate,
  onOpenFigure,
}: Props) {
  if (mode === 'document') {
    return (
      <PlanViewFigureDocumentPreview
        title={figureDocument.settings.title}
        orientation={figureDocument.settings.orientation}
        pages={figureDocument.pages}
        selectedPageId={figureDocument.selectedPageId}
        onSelect={figureDocument.setSelectedPageId}
      />
    )
  }
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
