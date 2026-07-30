import { Spline } from 'lucide-react'
import { AssessmentWorkspace } from '../AssessmentWorkspace'
import type { ProjectWorkflowModule } from '../projectWorkflowModule'
import type { ProjectWorkflowContext } from '../projectWorkflowTypes'

export const assessmentWorkflowModule: ProjectWorkflowModule<ProjectWorkflowContext> =
  {
    key: 'assessment',
    label: 'Assess',
    title: 'Assessment-line generation and stationing',
    icon: Spline,
    status: ({ assessmentLines }) => ({
      badge: assessmentLines.lines.length || undefined,
      tone:
        assessmentLines.lines.length > 0 ? 'ready' : 'neutral',
    }),
    render: (context) => (
      <AssessmentWorkspace
        busy={context.busy}
        hasSourceRuns={context.hasSourceRuns}
        sourceLabel={context.sourceLabel}
        assessmentLines={context.assessmentLines}
        stationed={context.stationed}
        stationing={context.assessmentReview}
        onAssessmentIntervalChange={
          context.onAssessmentIntervalChange
        }
        onGenerateAssessmentLines={
          context.onGenerateAssessmentLines
        }
        onClearAssessmentLines={context.onClearAssessmentLines}
        onOpenReview={context.openReview}
      />
    ),
  }
