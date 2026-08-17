import type { WorkspaceDraftSnapshot } from '../../core/types'
import { createWorkspaceDraftSnapshot } from '../figures/workspaceDraftRepository'
import type { PlanViewFigureSetItem } from './planViewFigureSet'
import type { PlanViewResultProjectState } from './planViewResultProjectFile'
import { planViewResultWorkspaceDraft } from './planViewResultWorkspaceDraft'

export function createPlanViewBatchReportDraft(
  base: PlanViewResultProjectState,
  item: PlanViewFigureSetItem,
): WorkspaceDraftSnapshot {
  const runByScenario = { ...base.scenarioSelection.runByScenario }
  if (item.selection.kind === 'scalar') {
    runByScenario[item.selection.scenarioId] = item.selection.runIndex
  }
  return createWorkspaceDraftSnapshot(planViewResultWorkspaceDraft, {
    ...base,
    settings: structuredClone(item.settings),
    scenarioSelection: {
      ...base.scenarioSelection,
      baselineId: item.selection.scenarioId,
      runByScenario,
    },
  })
}
