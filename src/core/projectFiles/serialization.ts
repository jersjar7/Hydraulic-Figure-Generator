import {
  PROJECT_FIGURE,
  PROJECT_FILE_VERSION,
  type HydraulicFigureProject,
  type HydraulicFigureProjectFile,
} from './schema'

export function serializeHydraulicFigureProject(
  project: Omit<HydraulicFigureProject, 'version' | 'figure'>,
): HydraulicFigureProjectFile {
  return {
    version: PROJECT_FILE_VERSION,
    activeFigure: PROJECT_FIGURE,
    project: {
      overlays: project.overlays,
      scenarioSelection: project.scenarioSelection,
    },
    figures: {
      [PROJECT_FIGURE]: {
        settings: project.settings,
        annotations: project.annotations,
        annotationDefaults: project.annotationDefaults,
        assessment: project.assessment,
      },
    },
  }
}
