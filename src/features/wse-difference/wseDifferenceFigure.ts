import { createDefaultFigureSettings } from '../../core/defaults'
import {
  canCompareWse,
  compareWse,
} from '../../application/hydraulics/compareWse'
import { WSE_DIFFERENCE_FIGURE_ID } from '../../core/figureIds'
import {
  runDisplayName,
  type HydraulicEngine,
} from '../../core/hydraulicEngine'
import {
  renderWseDifferenceDocument,
  type WseDifferenceRenderDocument,
} from '../../core/mapRenderer'
import type {
  ConditionKey,
  FigureSettings,
  WseDifferenceScene,
} from '../../core/types'
import {
  defineFigureEditor,
  type FigureModule,
} from '../figures/figureModule'
import {
  WSE_DIFFERENCE_SETTINGS_SECTIONS,
  type WseDifferenceSettingsSectionKey,
} from './wseDifferenceDefinition'

export { WSE_DIFFERENCE_FIGURE_ID }

export type WseDifferenceBuildRequest = {
  engine: HydraulicEngine
  baselineId: ConditionKey
  baselineRun: number
  comparisonId: ConditionKey
  comparisonRun: number
  dryDepth: number
}

export type WseDifferenceRenderRequest = {
  canvas: HTMLCanvasElement
  document: WseDifferenceRenderDocument
  signal?: AbortSignal
}

export const wseDifferenceFigure = {
  id: WSE_DIFFERENCE_FIGURE_ID,
  label: 'WSE Difference',
  workspaceLabel: 'FRA workspace',
  description: 'Comparison minus baseline water-surface elevation',
  editor: defineFigureEditor({
    inputs: [
      'hydraulic-models',
      'map-overlays',
      'assessment-lines',
    ],
    requiredScenarioRoles: ['baseline', 'comparison'],
    optionalScenarioRoles: ['assessment'],
    projectFileExtension: '.hydfig',
    settingsSections: WSE_DIFFERENCE_SETTINGS_SECTIONS,
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
          render: ['figure'],
          persistence: 'project-document',
          interaction: 'panel',
        },
      },
      {
        id: 'assessment-lines',
        bindings: {
          state: 'workspace-state',
          render: ['figure'],
          persistence: 'workspace-draft',
          interaction: 'canvas',
        },
      },
      {
        id: 'frame-view',
        bindings: {
          settingsSection: 'frame',
          state: 'figure-settings',
          render: ['figure'],
          persistence: 'workspace-draft',
          interaction: 'panel',
        },
      },
      {
        id: 'figure-elements',
        bindings: {
          settingsSection: 'elements',
          state: 'figure-settings',
          render: ['figure'],
          persistence: 'workspace-draft',
          interaction: 'canvas',
        },
      },
      {
        id: 'centerline-stationing',
        bindings: {
          settingsSection: 'stationing',
          state: 'figure-settings',
          render: ['figure'],
          persistence: 'workspace-draft',
          interaction: 'canvas',
        },
      },
      {
        id: 'annotations',
        bindings: {
          settingsSection: 'annotations',
          state: 'figure-settings',
          render: ['figure'],
          persistence: 'workspace-draft',
          interaction: 'canvas',
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
  createDefaultSettings: createDefaultFigureSettings,
  canGenerate: ({ engine, baselineId, comparisonId }) =>
    canCompareWse(engine, { baselineId, comparisonId }),
  buildScene: ({
    engine,
    baselineId,
    baselineRun,
    comparisonId,
    comparisonRun,
    dryDepth,
  }) =>
    compareWse(engine, {
      baselineId,
      baselineRun,
      comparisonId,
      comparisonRun,
      dryDepth,
    }),
  render: ({ canvas, document, signal }) =>
    renderWseDifferenceDocument(canvas, document, signal),
  exportFileName: (scene) =>
    [
      'FRA_WSE_Difference',
      runDisplayName(scene.existing.run.name),
      runDisplayName(scene.proposed.run.name),
    ]
      .map((part) => part.replace(/\s+/g, '_'))
      .join('_') + '.png',
} satisfies FigureModule<
  FigureSettings,
  WseDifferenceScene,
  WseDifferenceBuildRequest,
  WseDifferenceRenderRequest,
  WseDifferenceSettingsSectionKey
>
