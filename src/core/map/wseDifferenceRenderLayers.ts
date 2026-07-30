import {
  executeRenderLayers,
  type FigureRenderLayer,
} from './renderPipeline'
import { annotationsRenderLayer } from './wse-difference-layers/annotationsRenderLayer'
import { assessmentCalloutsRenderLayer } from './wse-difference-layers/assessmentCalloutsRenderLayer'
import { assessmentLinesRenderLayer } from './wse-difference-layers/assessmentLinesRenderLayer'
import { basemapRenderLayer } from './wse-difference-layers/basemapRenderLayer'
import { differenceBandsRenderLayer } from './wse-difference-layers/differenceBandsRenderLayer'
import { differenceOutlinesRenderLayer } from './wse-difference-layers/differenceOutlinesRenderLayer'
import { figureElementsRenderLayer } from './wse-difference-layers/figureElementsRenderLayer'
import { overlaysRenderLayer } from './wse-difference-layers/overlaysRenderLayer'
import { stationingRenderLayer } from './wse-difference-layers/stationingRenderLayer'
import { wetDryRenderLayer } from './wse-difference-layers/wetDryRenderLayer'
import type { WseDifferenceLayerContext } from './wse-difference-layers/wseDifferenceLayerContext'

export type { WseDifferenceLayerContext }

export const WSE_DIFFERENCE_RENDER_LAYERS: readonly FigureRenderLayer<WseDifferenceLayerContext>[] =
  [
    basemapRenderLayer,
    differenceBandsRenderLayer,
    wetDryRenderLayer,
    differenceOutlinesRenderLayer,
    assessmentLinesRenderLayer,
    overlaysRenderLayer,
    stationingRenderLayer,
    assessmentCalloutsRenderLayer,
    annotationsRenderLayer,
    figureElementsRenderLayer,
  ]

export function renderWseDifferenceLayers(
  context: WseDifferenceLayerContext,
) {
  return executeRenderLayers(
    WSE_DIFFERENCE_RENDER_LAYERS,
    context,
    context.signal,
  )
}
