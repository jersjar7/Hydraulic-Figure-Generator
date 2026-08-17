import type { RefObject } from 'react'
import type { PointerEventHandler } from 'react'
import type {
  AnnotationTool,
  MapElementKey,
  PlanViewResultScene,
} from '../../core/types'
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
  canvasRef: RefObject<HTMLCanvasElement | null>
  canvasFrameRef: RefObject<HTMLDivElement | null>
  displaySize: CanvasDisplaySize
  figureSet: ReturnType<typeof usePlanViewFigureSet>
  figureDocument: ReturnType<typeof usePlanViewFigureDocument>
  hasScenarios: boolean
  onOpenFigure(
    item: ReturnType<typeof usePlanViewFigureSet>['figureSet']['items'][number],
  ): void
  stationLabelDragging: boolean
  elementDragging: boolean
  hoveredElement: MapElementKey | null
  annotationTool: AnnotationTool
  onPointerDown: PointerEventHandler<HTMLCanvasElement>
  onPointerMove: PointerEventHandler<HTMLCanvasElement>
  onPointerUp: PointerEventHandler<HTMLCanvasElement>
  onPointerCancel: PointerEventHandler<HTMLCanvasElement>
  onPointerLeave: PointerEventHandler<HTMLCanvasElement>
}

export function PlanViewWorkspaceMap({
  mode,
  scene,
  canvasRef,
  canvasFrameRef,
  displaySize,
  figureSet,
  figureDocument,
  hasScenarios,
  onOpenFigure,
  stationLabelDragging,
  elementDragging,
  hoveredElement,
  annotationTool,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
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
        hasScenarios={hasScenarios}
        onOpen={onOpenFigure}
        onToggleIncluded={figureSet.toggleIncluded}
      />
    )
  }
  return (
    <PlanViewResultCanvas
      scene={scene}
      canvasRef={canvasRef}
      canvasFrameRef={canvasFrameRef}
      displaySize={displaySize}
      stationLabelDragging={stationLabelDragging}
      elementDragging={elementDragging}
      hoveredElement={hoveredElement}
      annotationTool={annotationTool}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
    />
  )
}
