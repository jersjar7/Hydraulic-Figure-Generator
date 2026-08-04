import { HYDRAULIC_PROFILES_FIGURE_ID } from '../../core/figureIds'
import type {
  HydraulicProfileScene,
  HydraulicProfileSection,
} from '../../core/types'
import type { FigureModule } from '../figures/figureModule'
import {
  HYDRAULIC_PROFILE_SETTINGS_SECTIONS,
  type HydraulicProfileSettingsSectionKey,
} from './hydraulicProfileDefinition'
import {
  renderHydraulicProfileDocument,
  type HydraulicProfileRenderDocument,
} from './hydraulicProfileRenderer'
import {
  createDefaultHydraulicProfileSettings,
  type HydraulicProfileFigureSettings,
} from './hydraulicProfileSettings'

type BuildRequest = {
  conditionLabel: string
  section: HydraulicProfileSection | null
}

type RenderRequest = {
  canvas: HTMLCanvasElement
  document: HydraulicProfileRenderDocument
}

export const hydraulicProfileFigure = {
  id: HYDRAULIC_PROFILES_FIGURE_ID,
  label: 'Hydraulic Profiles & Sections',
  workspaceLabel: 'Profile workspace',
  description: 'Single-station hydraulic cross sections from SMS clipboard exports',
  editor: {
    inputs: ['sms-summary-table', 'sms-profile-values'],
    requiredScenarioRoles: [],
    optionalScenarioRoles: [],
    shapefileOverlays: false,
    assessmentLines: false,
    centerlineStationing: false,
    annotations: false,
    projectFileExtension: '.hydfig',
    settingsSections: HYDRAULIC_PROFILE_SETTINGS_SECTIONS,
  },
  createDefaultSettings: createDefaultHydraulicProfileSettings,
  canGenerate: ({ section }) => Boolean(section),
  buildScene: ({ conditionLabel, section }) => {
    if (!section) throw new Error('Select a parsed cross section first.')
    return { conditionLabel, section }
  },
  render: ({ canvas, document }) =>
    Promise.resolve(renderHydraulicProfileDocument(canvas, document)),
  exportFileName: (scene) =>
    `Hydraulic_Profile_${scene.section.stationLabel.replace('+', '_')}.png`,
} satisfies FigureModule<
  HydraulicProfileFigureSettings,
  HydraulicProfileScene,
  BuildRequest,
  RenderRequest,
  HydraulicProfileSettingsSectionKey
>
