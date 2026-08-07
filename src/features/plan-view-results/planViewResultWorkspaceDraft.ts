import { createDefaultFigureDocumentSettings } from '../../core/types'
import { PLAN_VIEW_RESULTS_FIGURE_ID } from '../../core/figureIds'
import { defineWorkspaceDraftModule } from '../figures/workspaceDraftModule'
import { createHydraulicProjectDocument } from '../project-document/hydraulicProjectDocument'
import { createInitialScenarioSelection } from '../project-session/scenarioSelection'
import {
  PLAN_VIEW_RESULT_PROJECT_VERSION,
  parsePlanViewResultProject,
  serializePlanViewResultProject,
  type PlanViewResultProjectState,
} from './planViewResultProjectFile'
import { createPlanViewFigureSetDocument } from './planViewFigureSet'
import { createDefaultPlanViewResultSettings } from './planViewResultSettings'

export const planViewResultWorkspaceDraft = defineWorkspaceDraftModule({
  workspaceId: PLAN_VIEW_RESULTS_FIGURE_ID,
  schemaVersion: PLAN_VIEW_RESULT_PROJECT_VERSION,
  createInitialDraft: (): PlanViewResultProjectState => ({
    settings: createDefaultPlanViewResultSettings(),
    scenarioSelection: createInitialScenarioSelection(),
    project: createHydraulicProjectDocument(),
    figureSet: createPlanViewFigureSetDocument(),
    figureDocument: createDefaultFigureDocumentSettings(),
    stationingSource: { centerlines: [] },
  }),
  serializeDraft: serializePlanViewResultProject,
  parseDraft: parsePlanViewResultProject,
})
