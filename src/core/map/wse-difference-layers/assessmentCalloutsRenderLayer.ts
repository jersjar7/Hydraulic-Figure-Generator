import {
  drawAssessmentCallouts,
  drawAssessmentReviewMarkers,
} from '../assessmentLayer'
import type { FigureRenderLayer } from '../renderPipeline'
import type { WseDifferenceLayerContext } from './wseDifferenceLayerContext'

export const assessmentCalloutsRenderLayer: FigureRenderLayer<WseDifferenceLayerContext> =
  {
    id: 'assessment-callouts',
    render({ context, assessment, view, settings, frame }) {
      if (!settings.showAssessmentLines) return
      drawAssessmentCallouts(context, assessment, view, settings, frame)
      drawAssessmentReviewMarkers(context, assessment, view)
    },
  }
