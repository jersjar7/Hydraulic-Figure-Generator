import { ListChecks } from 'lucide-react'
import { AssessmentLinesReviewPanel } from '../../../features/assessment-lines/AssessmentLinesReviewPanel'
import type { ProjectWorkflowModule } from '../projectWorkflowModule'
import type { ProjectWorkflowContext } from '../projectWorkflowTypes'

export const reviewWorkflowModule: ProjectWorkflowModule<ProjectWorkflowContext> =
  {
    key: 'review',
    label: 'Review',
    title: 'Assessment-line review',
    icon: ListChecks,
    status: ({ assessmentLines, stationed }) => ({
      badge: stationed
        ? stationed.reviewCount > 0
          ? stationed.reviewCount
          : stationed.includedCount
        : assessmentLines.lines.length > 0
          ? '!'
          : undefined,
      tone: stationed
        ? stationed.reviewCount > 0
          ? 'warning'
          : 'ready'
        : assessmentLines.lines.length > 0
          ? 'warning'
          : 'neutral',
    }),
    render: ({ assessmentReview }) => (
      <AssessmentLinesReviewPanel {...assessmentReview} />
    ),
  }
