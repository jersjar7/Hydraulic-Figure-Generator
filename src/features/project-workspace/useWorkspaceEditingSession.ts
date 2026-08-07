import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  linkReportFigureEditTarget as linkEditTarget,
  pruneReportFigureEditTargets,
  unlinkReportFigureEditTarget as unlinkEditTarget,
  type ReportFigureEditTargets,
} from '../../application/report-assembly/reportFigureEditSession'
import type {
  ReportAssemblyDocument,
  ReportFigureArtifact,
} from '../../core/types'
import { createWorkspaceDraftRepository } from '../figures/workspaceDraftRepository'
import type { FigureId } from '../figures/workspaceRegistry'
import type { useProjectSession } from '../project-session/useProjectSession'
import { bindProjectWorkspace } from '../project-lifecycle/projectWorkspaceFolderAdapter'
import { workspaceSessionFolderAdapter } from '../project-lifecycle/workspaceSessionFolderAdapter'
import { createWorkspaceSessionProjectState } from '../project-lifecycle/workspaceSessionProjectFile'
import { stageReportFigureDraft } from './stageReportFigureDraft'
import type { AppWorkspaceId } from './hydraulicProjectWorkspaceContext'

type Options = {
  reportDocument: ReportAssemblyDocument
  projectSession: ReturnType<typeof useProjectSession>
  setActiveWorkspace(workspaceId: AppWorkspaceId): void
}

export function useWorkspaceEditingSession({
  reportDocument,
  projectSession,
  setActiveWorkspace,
}: Options) {
  const [draftRevision, setDraftRevision] = useState(0)
  const [workspaceDrafts] = useState(() => createWorkspaceDraftRepository(
    [],
    () => setDraftRevision((revision) => revision + 1),
  ))
  const [reportFigureEditTargets, setReportFigureEditTargets] =
    useState<ReportFigureEditTargets>({})
  const {
    inputReferences,
    loadInputReferences,
    reset: resetProjectSession,
  } = projectSession

  const folderBinding = useMemo(() => {
    void draftRevision
    return bindProjectWorkspace({
      adapter: workspaceSessionFolderAdapter,
      state: {
        drafts: workspaceDrafts.entries(),
        reportFigureEditTargets,
        hydraulicInputs: inputReferences,
      },
      hydrate: (session) => {
        resetProjectSession()
        workspaceDrafts.replace(session.drafts)
        setReportFigureEditTargets(session.reportFigureEditTargets)
        loadInputReferences(session.hydraulicInputs)
      },
      createInitialState: createWorkspaceSessionProjectState,
    })
  }, [
    draftRevision,
    inputReferences,
    loadInputReferences,
    reportFigureEditTargets,
    resetProjectSession,
    workspaceDrafts,
  ])

  const linkReportFigureEditTarget = useCallback((figure: ReportFigureArtifact) => {
    setReportFigureEditTargets((current) => linkEditTarget(current, figure))
  }, [])
  const unlinkReportFigureEditTarget = useCallback((workspaceId: FigureId) => {
    setReportFigureEditTargets((current) => unlinkEditTarget(current, workspaceId))
  }, [])
  const openReportFigureDraft = useCallback(async (figure: ReportFigureArtifact) => {
    const workspaceId = await stageReportFigureDraft(figure, workspaceDrafts)
    linkReportFigureEditTarget(figure)
    setActiveWorkspace(workspaceId)
  }, [linkReportFigureEditTarget, setActiveWorkspace, workspaceDrafts])

  useEffect(() => {
    setReportFigureEditTargets((current) =>
      pruneReportFigureEditTargets(reportDocument, current),
    )
  }, [reportDocument])

  return {
    workspaceDrafts,
    reportFigureEditTargets,
    linkReportFigureEditTarget,
    unlinkReportFigureEditTarget,
    openReportFigureDraft,
    folderBinding,
  }
}
