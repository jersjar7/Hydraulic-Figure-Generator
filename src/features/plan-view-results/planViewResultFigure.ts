import {
  buildPlanViewResult,
  canBuildPlanViewResult,
} from '../../application/hydraulics/buildPlanViewResult'
import { PLAN_VIEW_RESULTS_FIGURE_ID } from '../../core/figureIds'
import { runDisplayName, type HydraulicEngine } from '../../core/hydraulicEngine'
import {
  renderPlanViewResultDocument,
  type PlanViewResultRenderDocument,
} from '../../core/map/planViewResultRenderer'
import type {
  ConditionKey,
  PlanViewResultScene,
  PlanViewResultSettings,
} from '../../core/types'
import {
  defineFigureEditor,
  type FigureModule,
} from '../figures/figureModule'
import {
  PLAN_VIEW_RESULT_SETTINGS_SECTIONS,
  type PlanViewResultSettingsSectionKey,
} from './planViewResultDefinition'
import { createDefaultPlanViewResultSettings } from './planViewResultSettings'

export type PlanViewResultBuildRequest = {
  engine: HydraulicEngine
  scenarioId: ConditionKey
  runIndex?: number
  resultParameter: string
}

export type PlanViewResultRenderRequest = {
  canvas: HTMLCanvasElement
  document: PlanViewResultRenderDocument
  signal?: AbortSignal
}

export const planViewResultFigure = {
  id: PLAN_VIEW_RESULTS_FIGURE_ID,
  label: 'Plan-View Hydraulic Results',
  workspaceLabel: 'Hydraulic results workspace',
  description: 'Classified plan-view maps from scalar SMS results',
  editor: defineFigureEditor({
    inputs: ['hydraulic-models', 'map-overlays'],
    requiredScenarioRoles: ['baseline'],
    optionalScenarioRoles: [],
    projectFileExtension: '.hydfig',
    settingsSections: PLAN_VIEW_RESULT_SETTINGS_SECTIONS,
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
          interaction: 'panel',
        },
      },
      {
        id: 'centerline-stationing',
        bindings: {
          settingsSection: 'stationing',
          state: 'figure-settings',
          render: ['figure'],
          persistence: 'workspace-draft',
          interaction: 'panel',
        },
      },
      {
        id: 'annotations',
        bindings: {
          settingsSection: 'annotations',
          state: 'workspace-state',
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
      {
        id: 'batch-figure-generation',
        bindings: {
          state: 'workspace-state',
          render: ['figure'],
          persistence: 'workspace-draft',
          interaction: 'panel',
          export: ['report-artifact'],
        },
      },
      {
        id: 'figure-document-export',
        bindings: {
          state: 'workspace-state',
          render: ['document'],
          persistence: 'workspace-draft',
          interaction: 'panel',
          export: ['word'],
        },
      },
    ],
  }),
  createDefaultSettings: createDefaultPlanViewResultSettings,
  canGenerate: ({ engine, scenarioId, runIndex, resultParameter }) =>
    canBuildPlanViewResult(engine, {
      scenarioId,
      runIndex,
      resultParameter,
    }),
  buildScene: ({ engine, scenarioId, runIndex, resultParameter }) =>
    buildPlanViewResult(engine, {
      scenarioId,
      runIndex,
      resultParameter,
    }),
  render: ({ canvas, document, signal }) =>
    renderPlanViewResultDocument(canvas, document, signal),
  exportFileName: (scene) =>
    [scene.condition.label,
      scene.selection ? runDisplayName(scene.selection.run.name) : '',
      scene.result.label]
      .map((part) => part.replace(/\W+/g, '_').replace(/^_|_$/g, ''))
      .filter(Boolean)
      .join('_') + '.png',
} satisfies FigureModule<
  PlanViewResultSettings,
  PlanViewResultScene,
  PlanViewResultBuildRequest,
  PlanViewResultRenderRequest,
  PlanViewResultSettingsSectionKey
>
