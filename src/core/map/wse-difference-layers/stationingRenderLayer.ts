import { drawCenterlineStationing } from '../stationingLayer'
import type { FigureRenderLayer } from '../renderPipeline'
import type { WseDifferenceLayerContext } from './wseDifferenceLayerContext'

export const stationingRenderLayer: FigureRenderLayer<WseDifferenceLayerContext> =
  {
    id: 'stationing',
    render({ context, assessment, view, settings, frame }) {
      drawCenterlineStationing(
        context,
        assessment.centerlineStationing,
        view,
        settings,
        frame,
      )
    },
  }
