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
import type { FigureModule } from '../figures/figureModule'
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

export const crossSectionFigure: FigureModule<
  CrossSectionFigureSettings,
  HydraulicCrossSectionScene,
  CrossSectionBuildRequest,
  CrossSectionRenderRequest,
  CrossSectionSettingsSectionKey
> = {
  id: CROSS_SECTION_FIGURE_ID,
  label: 'Cross-Section Comparison',
  workspaceLabel: 'FRA workspace',
  description: 'Ground and discharge-weighted WSE comparison at a selected section',
  editor: {
    requiredScenarioRoles: ['baseline', 'comparison'],
    optionalScenarioRoles: ['assessment'],
    shapefileOverlays: true,
    assessmentLines: true,
    centerlineStationing: false,
    annotations: true,
    projectFileExtension: '.hydfig',
    settingsSections: CROSS_SECTION_SETTINGS_SECTIONS,
  },
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
}
