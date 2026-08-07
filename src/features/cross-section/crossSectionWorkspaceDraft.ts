import { CROSS_SECTION_FIGURE_ID } from '../../core/figureIds'
import { defineWorkspaceDraftModule } from '../figures/workspaceDraftModule'
import { createHydraulicProjectDocument } from '../project-document/hydraulicProjectDocument'
import { createInitialScenarioSelection } from '../project-session/scenarioSelection'
import {
  CROSS_SECTION_PROJECT_VERSION,
  parseCrossSectionProject,
  serializeCrossSectionProject,
} from './crossSectionProjectFile'
import { createDefaultCrossSectionSettings } from './crossSectionSettings'

export const crossSectionWorkspaceDraft = defineWorkspaceDraftModule({
  workspaceId: CROSS_SECTION_FIGURE_ID,
  schemaVersion: CROSS_SECTION_PROJECT_VERSION,
  createInitialDraft: () => ({
    settings: createDefaultCrossSectionSettings(),
    selectedLine: null,
    selectedAssessmentLineId: '',
    scenarioSelection: createInitialScenarioSelection(),
    project: createHydraulicProjectDocument(),
  }),
  serializeDraft: serializeCrossSectionProject,
  parseDraft: parseCrossSectionProject,
})
