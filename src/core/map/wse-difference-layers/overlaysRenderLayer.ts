import { drawOverlays } from '../overlayLayer'
import type { FigureRenderLayer } from '../renderPipeline'
import {
  withMapTransform,
  type WseDifferenceLayerContext,
} from './wseDifferenceLayerContext'

export const overlaysRenderLayer: FigureRenderLayer<WseDifferenceLayerContext> =
  {
    id: 'overlays',
    render(renderContext) {
      const { context, overlays, view, settings } = renderContext
      if (!settings.showOverlays) return
      withMapTransform(renderContext, () => {
        drawOverlays(context, overlays, view)
      })
    },
  }
