import {
  createHydraulicFigureProject,
  parseHydraulicFigureProject,
  PROJECT_FILE_VERSION,
} from '../../core/projectFile'
import { WSE_DIFFERENCE_FIGURE_ID } from '../../core/figureIds'
import { defineWorkspaceDraftModule } from '../figures/workspaceDraftModule'
import { createHydraulicProjectDocument } from '../project-document/hydraulicProjectDocument'
import { createWseFigureDocument } from './wseFigureDocument'
import {
  createWseProjectSnapshot,
  hydrateWseProject,
  type WseProjectState,
} from './wseProjectDocument'

function createInitialDraft(): WseProjectState {
  return {
    document: createWseFigureDocument(),
    project: createHydraulicProjectDocument(),
    scenarioSelection: {
      baselineId: 'EX',
      comparisonId: 'PR',
      assessmentId: 'EX',
      runByScenario: {},
    },
    assessment: {},
  }
}

export const wseWorkspaceDraft = defineWorkspaceDraftModule({
  workspaceId: WSE_DIFFERENCE_FIGURE_ID,
  schemaVersion: PROJECT_FILE_VERSION,
  createInitialDraft,
  serializeDraft: (draft) => JSON.stringify(
    createHydraulicFigureProject(createWseProjectSnapshot({
      ...draft.document,
      ...draft.project,
      scenarioSelection: draft.scenarioSelection,
      assessment: draft.assessment,
    })),
    null,
    2,
  ),
  parseDraft: (source) => {
    const initial = createInitialDraft()
    return hydrateWseProject(
      parseHydraulicFigureProject(source),
      initial.document,
      initial.project,
    )
  },
})
