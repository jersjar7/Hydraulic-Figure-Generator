import { createDefaultAnnotationSettings } from '../../core/defaults'
import { mergeElementStyles } from '../../core/figureElements'
import type { HydraulicProjectSnapshot } from '../../application/hydraulicProjectFiles'
import type {
  AssessmentWorkflowProject,
  HydraulicFigureProject,
  ScenarioSelectionProject,
} from '../../core/projectFile'
import type { WseFigureDocument } from './wseFigureDocument'

export type WseProjectState = {
  document: WseFigureDocument
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

export type CreateWseProjectSnapshotOptions = WseFigureDocument & {
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
  current: WseFigureDocument,
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
          current.settings.elementStyles,
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
          ...current.settings,
          ...settingsWithoutLegacyAliases,
          differenceOutlineColor:
            settingsWithoutLegacyAliases.differenceOutlineColor ??
            legacyContourColor ??
            current.settings.differenceOutlineColor,
          showDifferenceOutlines:
            settingsWithoutLegacyAliases.showDifferenceOutlines ??
            legacyShowContours ??
            current.settings.showDifferenceOutlines,
          showWetDryKey:
            settingsWithoutLegacyAliases.showWetDryKey ??
            current.settings.showWetDryKey,
          centerlineStationing: {
            ...current.settings.centerlineStationing,
            ...(settingsWithoutLegacyAliases.centerlineStationing ?? {}),
            overrides: {
              ...(settingsWithoutLegacyAliases.centerlineStationing
                ?.overrides ?? {}),
            },
          },
          elementPositions: {
            ...current.settings.elementPositions,
            ...(settingsWithoutLegacyAliases.elementPositions ?? {}),
          },
          elementStyles,
        }
      })()
    : current.settings
  const scenarioSelection = project.scenarioSelection

  return {
    document: {
      settings,
      overlays: project.overlays ?? current.overlays,
      annotations: project.annotations ?? current.annotations,
      annotationDefaults: {
        ...createDefaultAnnotationSettings(),
        ...current.annotationDefaults,
        ...(project.annotationDefaults ?? {}),
      },
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
