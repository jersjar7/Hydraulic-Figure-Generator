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
