import type { StationedAssessmentLineCollection } from '../../core/types'
import { AssessmentLinesReviewPanel } from './AssessmentLinesReviewPanel'
import type { useAssessmentWorkflow } from './useAssessmentWorkflow'

type Props = {
  workflow: ReturnType<typeof useAssessmentWorkflow>
  stationed: StationedAssessmentLineCollection | null
}

export function AssessmentLineReviewToolView({ workflow, stationed }: Props) {
  return (
    <>
      <div className="assessment-tool-review-heading">
        <button
          className="button secondary compact"
          type="button"
          onClick={workflow.closeReview}
        >
          Back to setup
        </button>
        <span>Review only the lines that need a decision.</span>
      </div>
      <AssessmentLinesReviewPanel
        reviewTab={workflow.state.reviewTab}
        selectedLineId={workflow.state.selectedLineId}
        overrides={workflow.state.overrides}
        stationed={stationed}
        onReviewTabChange={workflow.setReviewTab}
        onSelectLine={(id) =>
          workflow.selectLine(workflow.state.selectedLineId === id ? null : id)
        }
        onSetOverride={workflow.setOverride}
      />
    </>
  )
}
