import { Database } from 'lucide-react'
import { ModelsWorkspace } from '../ModelsWorkspace'
import type { ProjectWorkflowModule } from '../projectWorkflowModule'
import type { ProjectWorkflowContext } from '../projectWorkflowTypes'

function conditionComplete(
  condition: ProjectWorkflowContext['scenarios'][number],
) {
  return Boolean(
    condition.geometryFileName &&
      condition.datasetFileName &&
      condition.projected &&
      condition.datasets,
  )
}

export const modelsWorkflowModule: ProjectWorkflowModule<ProjectWorkflowContext> =
  {
    key: 'models',
    label: 'Models',
    title: 'Model inputs and run pairing',
    icon: Database,
    status: ({ scenarios, scenarioRoles }) => {
      const count = scenarios.filter(conditionComplete).length
      const required = scenarioRoles?.filter((role) => role.required).length ?? 2
      return {
        badge: count || undefined,
        tone: count >= required ? 'ready' : count > 0 ? 'warning' : 'neutral',
      }
    },
    render: (context) => (
      <ModelsWorkspace
        busy={context.busy}
        scenarios={context.scenarios}
        missingInputReferences={context.missingInputReferences}
        scenarioRoles={context.scenarioRoles}
        baselineId={context.baselineId}
        comparisonId={context.comparisonId}
        assessmentId={context.assessmentId}
        runByScenario={context.runByScenario}
        onH5Files={context.onH5Files}
        onRemoveCondition={context.onRemoveCondition}
        onRenameCondition={context.onRenameCondition}
        onProjectionOverride={context.onProjectionOverride}
        onRoleChange={context.onRoleChange}
        onRunChange={context.onRunChange}
        runsFor={context.runsFor}
      />
    ),
  }
