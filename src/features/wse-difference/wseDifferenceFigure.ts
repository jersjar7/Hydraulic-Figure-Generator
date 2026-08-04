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
import type { FigureModule } from '../figures/figureModule'
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
  editor: {
    inputs: [
      'hydraulic-models',
      'map-overlays',
      'assessment-lines',
    ],
    requiredScenarioRoles: ['baseline', 'comparison'],
    optionalScenarioRoles: ['assessment'],
    shapefileOverlays: true,
    assessmentLines: true,
    centerlineStationing: true,
    annotations: true,
    projectFileExtension: '.hydfig',
    settingsSections: WSE_DIFFERENCE_SETTINGS_SECTIONS,
  },
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
