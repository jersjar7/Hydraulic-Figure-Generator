import { drawDifferenceLegend } from '../differenceLegendElement'
import { drawMapElementSelection } from '../mapElementLayout'
import { drawNorthArrow } from '../northArrowElement'
import type { FigureRenderLayer } from '../renderPipeline'
import { drawScaleBar } from '../scaleBarElement'
import { drawTitle, resolveTitle } from '../titleElement'
import { drawWetDryKey } from '../wetDryKeyElement'
import type { WseDifferenceLayerContext } from './wseDifferenceLayerContext'

export const figureElementsRenderLayer: FigureRenderLayer<WseDifferenceLayerContext> =
  {
    id: 'figure-elements',
    render({
      context,
      scene,
      settings,
      frame,
      view,
      legendBound,
      selectedElementKey,
      elementBounds,
    }) {
      const positions = settings.elementPositions
      const styles = settings.elementStyles
      if (settings.showTitle) {
        elementBounds.push(
          drawTitle(
            context,
            resolveTitle(scene, settings.titleTemplate),
            frame,
            positions.title,
            styles.title,
          ),
        )
      }
      if (settings.showLegend) {
        elementBounds.push(
          drawDifferenceLegend(
            context,
            legendBound,
            settings.legendInterval,
            frame,
            positions.diffLegend,
            styles.diffLegend,
          ),
        )
      }
      if (settings.showNorth) {
        elementBounds.push(
          drawNorthArrow(
            context,
            frame,
            view.rotationRadians,
            positions.north,
            styles.north,
          ),
        )
      }
      if (settings.showScale) {
        elementBounds.push(
          drawScaleBar(
            context,
            frame,
            scene.projected.ftPerMerc / view.scale,
            positions.scale,
            styles.scale,
          ),
        )
      }
      if (settings.showWetDry && settings.showWetDryKey) {
        elementBounds.push(
          drawWetDryKey(
            context,
            frame,
            settings,
            positions.wetDry,
            styles.wetDry,
          ),
        )
      }
      const selected = elementBounds.find(
        (bounds) => bounds.key === selectedElementKey,
      )
      if (selected) drawMapElementSelection(context, selected)
    },
  }
