import { createDefaultAnnotationSettings } from '../../core/defaults'
import { mergeElementStyles } from '../../core/figureElements'
import type { HydraulicProjectSnapshot } from '../../application/hydraulicProjectFiles'
import type {
  AssessmentWorkflowProject,
  HydraulicFigureProject,
  ScenarioSelectionProject,
} from '../../core/projectFile'
import type { WseFigureDocument } from './wseFigureDocument'
import type { HydraulicProjectDocument } from '../project-document/hydraulicProjectDocument'

export type WseProjectState = {
  document: WseFigureDocument
  project: HydraulicProjectDocument
  scenarioSelection: Required<
    Pick<
      ScenarioSelectionProject,
      'baselineId' | 'comparisonId' | 'assessmentId' | 'runByScenario'
    >
  > & {
    labels?: Record<string, string>
  }
  assessment: AssessmentWorkflowProject
}

export type CreateWseProjectSnapshotOptions = WseFigureDocument &
  HydraulicProjectDocument & {
  scenarioSelection: ScenarioSelectionProject
  assessment: AssessmentWorkflowProject
}

export function createWseProjectSnapshot({
  settings,
  overlays,
  annotations,
  annotationDefaults,
  scenarioSelection,
  assessment,
}: CreateWseProjectSnapshotOptions): HydraulicProjectSnapshot {
  return {
    settings,
    overlays,
    annotations,
    annotationDefaults,
    scenarioSelection,
    assessment,
  }
}

export function hydrateWseProject(
  project: HydraulicFigureProject,
  currentFigure: WseFigureDocument,
  currentProject: HydraulicProjectDocument,
): WseProjectState {
  const projectSettings = project.settings
  const settings = projectSettings
    ? (() => {
        const {
          contourColor: legacyContourColor,
          showContours: legacyShowContours,
          ...settingsWithoutLegacyAliases
        } = projectSettings
        const elementStyles = mergeElementStyles(
          currentFigure.settings.elementStyles,
          projectSettings.elementStyles,
        )
        if (
          !projectSettings.elementStyles?.diffLegend &&
          typeof projectSettings.legendFontSize === 'number'
        ) {
          elementStyles.diffLegend.fontSize = projectSettings.legendFontSize
        }
        if (
          !projectSettings.elementStyles?.wetDry &&
          typeof projectSettings.legendFontSize === 'number'
        ) {
          elementStyles.wetDry.fontSize = Math.max(
            12,
            projectSettings.legendFontSize - 1,
          )
        }
        return {
          ...currentFigure.settings,
          ...settingsWithoutLegacyAliases,
          differenceOutlineColor:
            settingsWithoutLegacyAliases.differenceOutlineColor ??
            legacyContourColor ??
            currentFigure.settings.differenceOutlineColor,
          showDifferenceOutlines:
            settingsWithoutLegacyAliases.showDifferenceOutlines ??
            legacyShowContours ??
            currentFigure.settings.showDifferenceOutlines,
          showWetDryKey:
            settingsWithoutLegacyAliases.showWetDryKey ??
            currentFigure.settings.showWetDryKey,
          centerlineStationing: {
            ...currentFigure.settings.centerlineStationing,
            ...(settingsWithoutLegacyAliases.centerlineStationing ?? {}),
            overrides: {
              ...(settingsWithoutLegacyAliases.centerlineStationing
                ?.overrides ?? {}),
            },
          },
          elementPositions: {
            ...currentFigure.settings.elementPositions,
            ...(settingsWithoutLegacyAliases.elementPositions ?? {}),
          },
          elementStyles,
        }
      })()
    : currentFigure.settings
  const scenarioSelection = project.scenarioSelection

  return {
    document: {
      settings,
      annotations: project.annotations ?? currentFigure.annotations,
      annotationDefaults: {
        ...createDefaultAnnotationSettings(),
        ...currentFigure.annotationDefaults,
        ...(project.annotationDefaults ?? {}),
      },
    },
    project: {
      overlays: project.overlays ?? currentProject.overlays,
    },
    scenarioSelection: {
      baselineId: scenarioSelection?.baselineId ?? 'EX',
      comparisonId: scenarioSelection?.comparisonId ?? 'PR',
      assessmentId: scenarioSelection?.assessmentId ?? 'EX',
      runByScenario: scenarioSelection?.runByScenario ?? {
        EX: project.selectedRuns?.existingRun ?? 0,
        PR: project.selectedRuns?.proposedRun ?? 0,
      },
      labels: scenarioSelection?.labels,
    },
    assessment: project.assessment ?? {},
  }
}
