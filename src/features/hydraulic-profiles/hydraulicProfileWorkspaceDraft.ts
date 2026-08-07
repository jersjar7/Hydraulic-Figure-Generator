import { HYDRAULIC_PROFILES_FIGURE_ID } from '../../core/figureIds'
import { defineWorkspaceDraftModule } from '../figures/workspaceDraftModule'
import {
  HYDRAULIC_PROFILE_PROJECT_VERSION,
  parseHydraulicProfileProject,
  serializeHydraulicProfileProject,
} from './hydraulicProfileProjectFile'
import { createInitialHydraulicProfileDocument } from './hydraulicProfileDocument'

export const hydraulicProfileWorkspaceDraft = defineWorkspaceDraftModule({
  workspaceId: HYDRAULIC_PROFILES_FIGURE_ID,
  schemaVersion: HYDRAULIC_PROFILE_PROJECT_VERSION,
  createInitialDraft: createInitialHydraulicProfileDocument,
  serializeDraft: serializeHydraulicProfileProject,
  parseDraft: parseHydraulicProfileProject,
})
