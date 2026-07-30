import type {
  AssessmentMapLayer,
  FigureSettings,
  MapAnnotation,
  MapElementBounds,
  MapElementKey,
  MapOverlay,
  WseDifferenceScene,
} from '../../types'
import type { MapFrame, MapView } from '../view'

export type WseDifferenceLayerContext = {
  context: CanvasRenderingContext2D
  scene: WseDifferenceScene
  settings: FigureSettings
  frame: MapFrame
  view: MapView
  overlays: MapOverlay[]
  assessment: AssessmentMapLayer
  annotations: MapAnnotation[]
  selectedAnnotationId: string | null
  selectedElementKey: MapElementKey | null
  legendBound: number
  elementBounds: MapElementBounds[]
  signal?: AbortSignal
}

export function withMapTransform(
  renderContext: WseDifferenceLayerContext,
  draw: () => void,
) {
  const { context, view } = renderContext
  context.save()
  context.translate(view.originX, view.originY)
  context.rotate(view.rotationRadians)
  draw()
  context.restore()
}
