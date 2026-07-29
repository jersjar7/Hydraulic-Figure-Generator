import { createDefaultFigureSettings } from '../../core/defaults'
import { WSE_DIFFERENCE_FIGURE_ID } from '../../core/figureIds'
import {
  runDisplayName,
  type HydraulicEngine,
} from '../../core/hydraulicEngine'
import { renderWseDifferenceMap } from '../../core/mapRenderer'
import type {
  AssessmentMapLayer,
  Bounds,
  ConditionKey,
  FigureSettings,
  MapAnnotation,
  MapElementKey,
  MapOverlay,
  WseAssessmentLine,
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
  scene: WseDifferenceScene
  commonBounds: Bounds
  settings: FigureSettings
  overlays?: MapOverlay[]
  assessment?: AssessmentMapLayer | WseAssessmentLine[]
  annotations?: MapAnnotation[]
  selectedAnnotationId?: string | null
  selectedElementKey?: MapElementKey | null
  signal?: AbortSignal
}

export const wseDifferenceFigure: FigureModule<
  FigureSettings,
  WseDifferenceScene,
  WseDifferenceBuildRequest,
  WseDifferenceRenderRequest,
  WseDifferenceSettingsSectionKey
> = {
  id: WSE_DIFFERENCE_FIGURE_ID,
  label: 'WSE Difference',
  workspaceLabel: 'FRA workspace',
  description: 'Comparison minus baseline water-surface elevation',
  editor: {
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
    engine.isReady(baselineId, comparisonId),
  buildScene: ({
    engine,
    baselineId,
    baselineRun,
    comparisonId,
    comparisonRun,
    dryDepth,
  }) =>
    engine.buildWseDifference(
      baselineId,
      baselineRun,
      comparisonId,
      comparisonRun,
      dryDepth,
    ),
  render: ({
    canvas,
    scene,
    commonBounds,
    settings,
    overlays = [],
    assessment = [],
    annotations = [],
    selectedAnnotationId = null,
    selectedElementKey = null,
    signal,
  }) =>
    renderWseDifferenceMap(
      canvas,
      scene,
      commonBounds,
      settings,
      overlays,
      assessment,
      annotations,
      selectedAnnotationId,
      selectedElementKey,
      signal,
    ),
  exportFileName: (scene) =>
    [
      'FRA_WSE_Difference',
      runDisplayName(scene.existing.run.name),
      runDisplayName(scene.proposed.run.name),
    ]
      .map((part) => part.replace(/\s+/g, '_'))
      .join('_') + '.png',
}
