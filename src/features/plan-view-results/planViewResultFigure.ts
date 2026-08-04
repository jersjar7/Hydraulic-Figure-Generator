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
import type { FigureModule } from '../figures/figureModule'
import {
  PLAN_VIEW_RESULT_SETTINGS_SECTIONS,
  type PlanViewResultSettingsSectionKey,
} from './planViewResultDefinition'
import { createDefaultPlanViewResultSettings } from './planViewResultSettings'

export type PlanViewResultBuildRequest = {
  engine: HydraulicEngine
  scenarioId: ConditionKey
  runIndex: number
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
  editor: {
    inputs: ['hydraulic-models', 'map-overlays'],
    requiredScenarioRoles: ['baseline'],
    optionalScenarioRoles: [],
    shapefileOverlays: true,
    assessmentLines: false,
    centerlineStationing: false,
    annotations: false,
    projectFileExtension: '.hydfig',
    settingsSections: PLAN_VIEW_RESULT_SETTINGS_SECTIONS,
  },
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
    [
      scene.selection.condition.label,
      runDisplayName(scene.selection.run.name),
      scene.result.label,
    ]
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
