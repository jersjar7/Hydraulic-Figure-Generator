import {
  fillDifferenceBands,
  localCoordinates,
} from '../hydraulicLayers'
import type { FigureRenderLayer } from '../renderPipeline'
import {
  withMapTransform,
  type WseDifferenceLayerContext,
} from './wseDifferenceLayerContext'

export const differenceBandsRenderLayer: FigureRenderLayer<WseDifferenceLayerContext> =
  {
    id: 'difference-bands',
    render(renderContext) {
      const { context, scene, view, settings, legendBound } =
        renderContext
      withMapTransform(renderContext, () => {
        const coordinates = localCoordinates(scene.projected, view)
        fillDifferenceBands(
          context,
          coordinates.localX,
          coordinates.localY,
          scene.projected.tris,
          scene.diff,
          legendBound,
          settings.legendInterval,
        )
      })
    },
  }
