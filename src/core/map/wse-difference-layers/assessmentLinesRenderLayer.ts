import {
  drawAssessmentLines,
  drawAssessmentSelection,
} from '../assessmentLayer'
import type { FigureRenderLayer } from '../renderPipeline'
import {
  withMapTransform,
  type WseDifferenceLayerContext,
} from './wseDifferenceLayerContext'

export const assessmentLinesRenderLayer: FigureRenderLayer<WseDifferenceLayerContext> =
  {
    id: 'assessment-lines',
    render(renderContext) {
      const { context, assessment, view, settings } = renderContext
      if (!settings.showAssessmentLines) return
      withMapTransform(renderContext, () => {
        drawAssessmentLines(
          context,
          assessment.lines,
          view,
          settings.assessmentLineColor,
          settings.assessmentLineWidth,
        )
        drawAssessmentSelection(
          context,
          assessment.selectedLine,
          view,
          settings.assessmentLineWidth,
        )
      })
    },
  }
