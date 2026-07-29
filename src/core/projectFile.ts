import {
  type HydraulicFigureProject,
} from './projectFiles/schema'
import { deserializeHydraulicFigureProject } from './projectFiles/deserialization'
import { serializeHydraulicFigureProject } from './projectFiles/serialization'

export {
  PROJECT_FIGURE,
  PROJECT_FILE_VERSION,
  type AssessmentWorkflowProject,
  type HydraulicFigureProject,
  type HydraulicFigureProjectFile,
  type ProjectSettings,
  type ScenarioSelectionProject,
} from './projectFiles/schema'

export function createHydraulicFigureProject(
  project: Omit<HydraulicFigureProject, 'version' | 'figure'>,
) {
  return serializeHydraulicFigureProject(project)
}

export function parseHydraulicFigureProject(
  source: string,
): HydraulicFigureProject {
  return deserializeHydraulicFigureProject(source)
}
