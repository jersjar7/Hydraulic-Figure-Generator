import {
  fillWetDry,
  localCoordinates,
} from '../hydraulicLayers'
import type { FigureRenderLayer } from '../renderPipeline'
import {
  withMapTransform,
  type WseDifferenceLayerContext,
} from './wseDifferenceLayerContext'

export const wetDryRenderLayer: FigureRenderLayer<WseDifferenceLayerContext> =
  {
    id: 'wet-dry',
    render(renderContext) {
      const { context, scene, view, settings } = renderContext
      if (!settings.showWetDry) return
      withMapTransform(renderContext, () => {
        const existing = localCoordinates(scene.projected, view)
        const proposed = localCoordinates(scene.proposedProjected, view)
        fillWetDry(
          context,
          existing.localX,
          existing.localY,
          scene.projected.tris,
          scene.wetDry,
          settings,
        )
        fillWetDry(
          context,
          proposed.localX,
          proposed.localY,
          scene.proposedProjected.tris,
          scene.proposedWetDry,
          settings,
        )
      })
    },
  }
