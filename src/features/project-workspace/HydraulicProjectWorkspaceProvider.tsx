import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createReportAssemblyDocument } from '../../application/report-assembly/reportAssembly'
import { useHydraulicProjectDocument } from '../project-document/useHydraulicProjectDocument'
import { useProjectSession } from '../project-session/useProjectSession'
import { useReportAssembly } from '../report-assembly/useReportAssembly'
import {
  useHydraulicProfileDocument,
} from '../hydraulic-profiles/useHydraulicProfileDocument'
import { createInitialHydraulicProfileDocument } from '../hydraulic-profiles/hydraulicProfileDocument'
import { hydraulicProfileFolderAdapter } from '../project-lifecycle/hydraulicProfileFolderAdapter'
import { bindProjectWorkspace } from '../project-lifecycle/projectWorkspaceFolderAdapter'
import { reportAssemblyFolderAdapter } from '../project-lifecycle/reportAssemblyFolderAdapter'
import { useHydraulicProjectLifecycle } from '../project-lifecycle/useHydraulicProjectLifecycle'
import {
  DEFAULT_FIGURE_WORKSPACE,
  FIGURE_WORKSPACES,
} from '../figures/workspaceRegistry'
import { createWorkspaceDraftRepository } from '../figures/workspaceDraftRepository'
import type { AppWorkspaceId } from './hydraulicProjectWorkspaceContext'
import { HydraulicProjectWorkspaceContext } from './hydraulicProjectWorkspaceContext'
import { stageReportFigureDraft } from './stageReportFigureDraft'
import {
  linkReportFigureEditTarget as linkEditTarget,
  pruneReportFigureEditTargets,
  unlinkReportFigureEditTarget as unlinkEditTarget,
  type ReportFigureEditTargets,
} from '../../application/report-assembly/reportFigureEditSession'
import type { ReportFigureArtifact } from '../../core/types'
import type { FigureId } from '../figures/workspaceRegistry'
import { workspaceSessionFolderAdapter } from '../project-lifecycle/workspaceSessionFolderAdapter'
import { createWorkspaceSessionProjectState } from '../project-lifecycle/workspaceSessionProjectFile'

export function HydraulicProjectWorkspaceProvider({
  children,
}: {
  children: ReactNode
}) {
  const [activeFigureId, setActiveFigureId] = useState<AppWorkspaceId>(
    DEFAULT_FIGURE_WORKSPACE.id,
  )
  const [draftRevision, setDraftRevision] = useState(0)
  const [workspaceDrafts] = useState(() => createWorkspaceDraftRepository(
    [],
    () => setDraftRevision((revision) => revision + 1),
  ))
  const [reportFigureEditTargets, setReportFigureEditTargets] =
    useState<ReportFigureEditTargets>({})
  const projectSession = useProjectSession()
  const {
    inputReferences,
    loadInputReferences,
    reset: resetProjectSession,
  } = projectSession
  const projectDocument = useHydraulicProjectDocument()
  const reportAssembly = useReportAssembly()
  const hydraulicProfiles = useHydraulicProfileDocument()
  const persistedWorkspaces = useMemo(() => {
    void draftRevision
    return [
    bindProjectWorkspace({
      adapter: hydraulicProfileFolderAdapter,
      state: hydraulicProfiles.snapshot,
      hydrate: hydraulicProfiles.hydrate,
      createInitialState: createInitialHydraulicProfileDocument,
    }),
    bindProjectWorkspace({
      adapter: reportAssemblyFolderAdapter,
      state: reportAssembly.document,
      hydrate: reportAssembly.load,
      createInitialState: createReportAssemblyDocument,
    }),
    bindProjectWorkspace({
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
    }),
  ]
  }, [
    draftRevision,
    hydraulicProfiles.hydrate,
    hydraulicProfiles.snapshot,
    reportAssembly.document,
    reportAssembly.load,
    reportFigureEditTargets,
    inputReferences,
    loadInputReferences,
    resetProjectSession,
    workspaceDrafts,
  ])
  const projectLifecycle = useHydraulicProjectLifecycle({
    workspaces: persistedWorkspaces,
    availableWorkspaceIds: [
      ...FIGURE_WORKSPACES.map((workspace) => workspace.id),
      'report-assembly',
    ],
    activeWorkspaceId: activeFigureId,
    setActiveWorkspace: setActiveFigureId,
  })
  const linkReportFigureEditTarget = useCallback((figure: ReportFigureArtifact) => {
    setReportFigureEditTargets((current) => linkEditTarget(current, figure))
  }, [])
  const unlinkReportFigureEditTarget = useCallback((workspaceId: FigureId) => {
    setReportFigureEditTargets((current) => unlinkEditTarget(current, workspaceId))
  }, [])
  const openReportFigureDraft = useCallback(async (
    figure: Parameters<typeof stageReportFigureDraft>[0],
  ) => {
    const workspaceId = await stageReportFigureDraft(figure, workspaceDrafts)
    linkReportFigureEditTarget(figure)
    setActiveFigureId(workspaceId)
  }, [linkReportFigureEditTarget, workspaceDrafts])

  useEffect(() => {
    setReportFigureEditTargets((current) =>
      pruneReportFigureEditTargets(reportAssembly.document, current),
    )
  }, [reportAssembly.document])

  return (
    <HydraulicProjectWorkspaceContext.Provider
      value={{
        activeFigureId,
        setActiveFigureId,
        projectSession,
        projectDocument,
        reportAssembly,
        hydraulicProfiles,
        workspaceDrafts,
        reportFigureEditTargets,
        linkReportFigureEditTarget,
        unlinkReportFigureEditTarget,
        openReportFigureDraft,
        projectLifecycle,
      }}
    >
      {children}
    </HydraulicProjectWorkspaceContext.Provider>
  )
}
