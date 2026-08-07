import type { ReportFigureArtifact } from '../../core/types'
import type { FigureId } from '../figures/workspaceRegistry'
import { figureWorkspaceById } from '../figures/workspaceRegistry'
import type { WorkspaceDraftModule } from '../figures/workspaceDraftModule'
import type { WorkspaceDraftRepository } from '../figures/workspaceDraftRepository'

export async function stageReportFigureDraft(
  figure: ReportFigureArtifact,
  repository: WorkspaceDraftRepository,
): Promise<FigureId> {
  const snapshot = figure.workspaceDraft
  if (!snapshot) {
    throw new Error('This legacy figure does not contain an editable workspace draft.')
  }
  const workspace = figureWorkspaceById(figure.workspaceId)
  if (!workspace) {
    throw new Error(`The ${figure.workspaceLabel} workspace is not available.`)
  }
  if (snapshot.workspaceId !== workspace.id) {
    throw new Error('The figure draft does not belong to its workspace.')
  }

  const module = await workspace.draft.load() as WorkspaceDraftModule<
    FigureId,
    unknown
  >
  if (snapshot.schemaVersion !== module.schemaVersion) {
    throw new Error(
      `This figure uses ${figure.workspaceLabel} draft version ${snapshot.schemaVersion}; version ${module.schemaVersion} is required.`,
    )
  }

  let draft: unknown
  try {
    draft = module.parseDraft(snapshot.source)
  } catch (caught) {
    const detail = caught instanceof Error ? caught.message : String(caught)
    throw new Error(`The saved ${figure.workspaceLabel} draft is invalid: ${detail}`)
  }
  repository.capture(module, draft)
  return workspace.id
}
