import { buildHydraulicCrossSection } from '../../application/hydraulics/buildHydraulicCrossSection'
import { CROSS_SECTION_FIGURE_ID } from '../../core/figureIds'
import {
  runDisplayName,
  type HydraulicEngine,
} from '../../core/hydraulicEngine'
import type {
  ConditionKey,
  CrossSectionLine,
  HydraulicCrossSectionScene,
} from '../../core/types'
import {
  defineFigureEditor,
  type FigureModule,
} from '../figures/figureModule'
import {
  CROSS_SECTION_SETTINGS_SECTIONS,
  type CrossSectionSettingsSectionKey,
} from './crossSectionDefinition'
import {
  renderCrossSectionDocument,
  type CrossSectionRenderDocument,
} from './crossSectionRenderer'
import {
  createDefaultCrossSectionSettings,
  type CrossSectionFigureSettings,
} from './crossSectionSettings'

export type CrossSectionBuildRequest = {
  engine: HydraulicEngine
  baselineId: ConditionKey
  baselineRun: number
  comparisonId: ConditionKey
  comparisonRun: number
  line: CrossSectionLine
  dryDepth: number
  sampleSpacing: number
}

export type CrossSectionRenderRequest = {
  canvas: HTMLCanvasElement
  document: CrossSectionRenderDocument
}

export const crossSectionFigure = {
  id: CROSS_SECTION_FIGURE_ID,
  label: 'Cross-Section Comparison',
  workspaceLabel: 'FRA workspace',
  description: 'Compare ground and discharge-weighted WSE along a selected cross section',
  editor: defineFigureEditor({
    inputs: [
      'hydraulic-models',
      'map-overlays',
      'assessment-lines',
    ],
    requiredScenarioRoles: ['baseline', 'comparison'],
    optionalScenarioRoles: ['assessment'],
    projectFileExtension: '.hydfig',
    settingsSections: CROSS_SECTION_SETTINGS_SECTIONS,
    supportedTools: [
      {
        id: 'hydraulic-models',
        bindings: {
          state: 'workspace-state',
          persistence: 'workspace-draft',
          interaction: 'panel',
        },
      },
      {
        id: 'map-overlays',
        bindings: {
          state: 'project-document',
          render: ['selection-map'],
          persistence: 'project-document',
          interaction: 'panel',
        },
      },
      {
        id: 'assessment-lines',
        bindings: {
          state: 'workspace-state',
          render: ['selection-map'],
          persistence: 'workspace-draft',
          interaction: 'canvas',
        },
      },
      {
        id: 'chart-line-styles',
        bindings: {
          settingsSection: 'styles',
          state: 'figure-settings',
          render: ['figure'],
          persistence: 'workspace-draft',
          interaction: 'panel',
        },
      },
      {
        id: 'chart-axes',
        bindings: {
          settingsSection: 'display',
          state: 'figure-settings',
          render: ['figure'],
          persistence: 'workspace-draft',
          interaction: 'panel',
        },
      },
      {
        id: 'single-figure-export',
        bindings: {
          settingsSection: 'export',
          state: 'figure-settings',
          render: ['figure'],
          persistence: 'workspace-draft',
          interaction: 'panel',
          export: ['png', 'report-artifact'],
        },
      },
    ],
  }),
  createDefaultSettings: createDefaultCrossSectionSettings,
  canGenerate: ({ engine, baselineId, comparisonId, line }) =>
    engine.isReady(baselineId, comparisonId) && line.points.length >= 2,
  buildScene: ({
    engine,
    baselineId,
    baselineRun,
    comparisonId,
    comparisonRun,
    line,
    dryDepth,
    sampleSpacing,
  }) =>
    buildHydraulicCrossSection(engine, {
      baselineKey: baselineId,
      baselineRunIndex: baselineRun,
      comparisonKey: comparisonId,
      comparisonRunIndex: comparisonRun,
      line,
      dryDepth,
      sampleSpacing,
    }),
  render: ({ canvas, document }) =>
    Promise.resolve(renderCrossSectionDocument(canvas, document)),
  exportFileName: (scene) =>
    [
      'FRA_Cross_Section',
      scene.line.label,
      runDisplayName(scene.baseline.run.name),
      runDisplayName(scene.comparison.run.name),
    ]
      .map((part) => part.replace(/\s+/g, '_'))
      .join('_') + '.png',
} satisfies FigureModule<
  CrossSectionFigureSettings,
  HydraulicCrossSectionScene,
  CrossSectionBuildRequest,
  CrossSectionRenderRequest,
  CrossSectionSettingsSectionKey
>
