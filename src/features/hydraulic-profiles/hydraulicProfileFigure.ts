import { HYDRAULIC_PROFILES_FIGURE_ID } from '../../core/figureIds'
import type {
  HydraulicProfileScene,
  HydraulicProfileSection,
} from '../../core/types'
import {
  defineFigureEditor,
  type FigureModule,
} from '../figures/figureModule'
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
  description: 'Build cross sections and longitudinal profiles from SMS summary and profile values',
  editor: defineFigureEditor({
    inputs: ['sms-summary-table', 'sms-profile-values'],
    requiredScenarioRoles: [],
    optionalScenarioRoles: [],
    projectFileExtension: '.hydfig',
    settingsSections: HYDRAULIC_PROFILE_SETTINGS_SECTIONS,
    supportedTools: [
      {
        id: 'chart-line-styles',
        bindings: {
          settingsSection: 'lines',
          state: 'figure-settings',
          render: ['figure'],
          persistence: 'workspace-draft',
          interaction: 'panel',
        },
      },
      {
        id: 'chart-axes',
        bindings: {
          settingsSection: 'axes',
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
    ],
  }),
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
