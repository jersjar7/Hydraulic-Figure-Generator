import { drawBasemap } from '../basemapLayer'
import type { FigureRenderLayer } from '../renderPipeline'
import type { WseDifferenceLayerContext } from './wseDifferenceLayerContext'

export const basemapRenderLayer: FigureRenderLayer<WseDifferenceLayerContext> =
  {
    id: 'basemap',
    async render({ context, frame, settings, view, signal }) {
      context.clearRect(0, 0, frame.width, frame.height)
      context.fillStyle = '#dce4ec'
      context.fillRect(0, 0, frame.width, frame.height)
      await drawBasemap(
        context,
        view,
        settings.basemapOpacity,
        signal,
      )
    },
  }
