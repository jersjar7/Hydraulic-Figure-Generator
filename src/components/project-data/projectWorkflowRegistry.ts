import {
  defineProjectWorkflowModules,
  findProjectWorkflowModule,
} from './projectWorkflowModule'
import type { ProjectWorkflowContext } from './projectWorkflowTypes'
import { assessmentWorkflowModule } from './workflows/assessmentWorkflowModule'
import { layersWorkflowModule } from './workflows/layersWorkflowModule'
import { modelsWorkflowModule } from './workflows/modelsWorkflowModule'
import { reviewWorkflowModule } from './workflows/reviewWorkflowModule'

export const PROJECT_WORKFLOW_MODULES =
  defineProjectWorkflowModules<ProjectWorkflowContext>([
    modelsWorkflowModule,
    layersWorkflowModule,
    assessmentWorkflowModule,
    reviewWorkflowModule,
  ])

export function projectWorkflowByKey(
  key: (typeof PROJECT_WORKFLOW_MODULES)[number]['key'],
) {
  return findProjectWorkflowModule(PROJECT_WORKFLOW_MODULES, key)
}

const INPUT_WORKFLOWS = {
  'hydraulic-models': ['models'],
  'map-overlays': ['layers'],
  'assessment-lines': ['assessment', 'review'],
} as const satisfies Partial<
  Record<
    WorkspaceInputCapability,
    readonly (typeof PROJECT_WORKFLOW_MODULES)[number]['key'][]
  >
>

export function hasProjectWorkflowForInput(
  input: WorkspaceInputCapability,
) {
  return input in INPUT_WORKFLOWS
}

export function projectWorkflowsForInputs(
  inputs: readonly WorkspaceInputCapability[],
) {
  const enabled = new Set(
    inputs.flatMap(
      (input) =>
        INPUT_WORKFLOWS[input as keyof typeof INPUT_WORKFLOWS] ?? [],
    ),
  )
  return PROJECT_WORKFLOW_MODULES.filter((module) => enabled.has(module.key))
}
import type { WorkspaceInputCapability } from '../../core/contracts/workspace'
