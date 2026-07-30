import {
  differenceBreaks,
  drawContourLevels,
  drawValidBoundary,
  localCoordinates,
} from '../hydraulicLayers'
import type { FigureRenderLayer } from '../renderPipeline'
import {
  withMapTransform,
  type WseDifferenceLayerContext,
} from './wseDifferenceLayerContext'

export const differenceOutlinesRenderLayer: FigureRenderLayer<WseDifferenceLayerContext> =
  {
    id: 'difference-outlines',
    render(renderContext) {
      const { context, scene, view, settings, legendBound } =
        renderContext
      if (!settings.showDifferenceOutlines) return
      withMapTransform(renderContext, () => {
        const coordinates = localCoordinates(scene.projected, view)
        drawContourLevels(
          context,
          coordinates.localX,
          coordinates.localY,
          scene.projected.tris,
          scene.diff,
          differenceBreaks(legendBound, settings.legendInterval),
          settings.differenceOutlineColor,
        )
        drawValidBoundary(
          context,
          coordinates.localX,
          coordinates.localY,
          scene.projected.tris,
          scene.diff,
          settings.differenceOutlineColor,
        )
      })
    },
  }
