import {
  drawAnnotations,
  drawAnnotationSelection,
} from '../annotationLayer'
import type { FigureRenderLayer } from '../renderPipeline'
import type { WseDifferenceLayerContext } from './wseDifferenceLayerContext'

export const annotationsRenderLayer: FigureRenderLayer<WseDifferenceLayerContext> =
  {
    id: 'annotations',
    render({
      context,
      annotations,
      view,
      selectedAnnotationId,
    }) {
      drawAnnotations(context, annotations, view)
      const selected = annotations.find(
        (annotation) => annotation.id === selectedAnnotationId,
      )
      if (selected) drawAnnotationSelection(context, selected, view)
    },
  }
