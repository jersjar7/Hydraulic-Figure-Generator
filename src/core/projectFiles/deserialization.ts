import type { MapAnnotation } from '../types'
import { migrateAssessmentLabelSettings } from './migrations'
import {
  PROJECT_FIGURE,
  PROJECT_FILE_VERSION,
  type HydraulicFigureProject,
} from './schema'
import {
  annotation,
  annotationDefaults,
  assessmentWorkflow,
  integer,
  overlay,
  record,
  scenarioSelection,
  settings,
  shape,
} from './validation'

export function deserializeHydraulicFigureProject(
  source: string,
): HydraulicFigureProject {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch {
    throw new Error('The project file is not valid JSON.')
  }

  const input = record(parsed, 'Project')
  const version =
    input.version === undefined
      ? 1
      : (integer(1)(input.version, 'Project.version') as number)
  if (version > PROJECT_FILE_VERSION) {
    throw new Error(
      `This project uses version ${version}; this app supports through version ${PROJECT_FILE_VERSION}.`,
    )
  }
  if (
    version < 14 &&
    input.figure !== undefined &&
    input.figure !== PROJECT_FIGURE
  ) {
    throw new Error(
      `This file is for a different figure type: ${String(input.figure)}.`,
    )
  }

  let sharedInput = input
  let figureInput = input
  let sharedPath = 'Project'
  let figurePath = 'Project'
  if (version >= 14) {
    if (input.activeFigure !== PROJECT_FIGURE) {
      throw new Error(
        `This file is for a different figure type: ${String(input.activeFigure)}.`,
      )
    }
    sharedInput = record(input.project, 'Project.project')
    const figures = record(input.figures, 'Project.figures')
    figureInput = record(
      figures[PROJECT_FIGURE],
      `Project.figures.${PROJECT_FIGURE}`,
    )
    sharedPath = 'Project.project'
    figurePath = `Project.figures.${PROJECT_FIGURE}`
  }

  const result: HydraulicFigureProject = {
    version: PROJECT_FILE_VERSION,
    figure: PROJECT_FIGURE,
  }
  if (figureInput.settings !== undefined) {
    result.settings = migrateAssessmentLabelSettings(
      settings(figureInput.settings, `${figurePath}.settings`),
    )
  }
  if (sharedInput.overlays !== undefined) {
    if (!Array.isArray(sharedInput.overlays)) {
      throw new Error(`${sharedPath}.overlays must be an array.`)
    }
    result.overlays = sharedInput.overlays.map((item, index) =>
      overlay(item, `${sharedPath}.overlays[${index}]`),
    )
  }
  if (figureInput.annotations !== undefined) {
    if (!Array.isArray(figureInput.annotations)) {
      throw new Error(`${figurePath}.annotations must be an array.`)
    }
    result.annotations = figureInput.annotations
      .map((item, index) =>
        annotation(item, `${figurePath}.annotations[${index}]`),
      )
      .filter((item): item is MapAnnotation => item !== null)
  }
  if (figureInput.annotationDefaults !== undefined) {
    result.annotationDefaults = annotationDefaults(
      figureInput.annotationDefaults,
      `${figurePath}.annotationDefaults`,
    )
  }
  if (input.selectedRuns !== undefined) {
    result.selectedRuns = shape(input.selectedRuns, 'Project.selectedRuns', {
      existingRun: integer(0),
      proposedRun: integer(0),
    })
  }
  if (sharedInput.scenarioSelection !== undefined) {
    result.scenarioSelection = scenarioSelection(
      sharedInput.scenarioSelection,
      `${sharedPath}.scenarioSelection`,
    )
  } else if (result.selectedRuns) {
    result.scenarioSelection = {
      baselineId: 'EX',
      comparisonId: 'PR',
      assessmentId: 'EX',
      runByScenario: {
        EX: result.selectedRuns.existingRun ?? 0,
        PR: result.selectedRuns.proposedRun ?? 0,
      },
    }
  }
  if (figureInput.assessment !== undefined) {
    result.assessment = assessmentWorkflow(
      figureInput.assessment,
      `${figurePath}.assessment`,
    )
  }
  return result
}
