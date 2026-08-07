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

export function HydraulicProjectWorkspaceProvider({
  children,
}: {
  children: ReactNode
}) {
  const [activeFigureId, setActiveFigureId] = useState<AppWorkspaceId>(
    DEFAULT_FIGURE_WORKSPACE.id,
  )
  const [workspaceDrafts] = useState(createWorkspaceDraftRepository)
  const [reportFigureEditTargets, setReportFigureEditTargets] =
    useState<ReportFigureEditTargets>({})
  const projectSession = useProjectSession()
  const projectDocument = useHydraulicProjectDocument()
  const reportAssembly = useReportAssembly()
  const hydraulicProfiles = useHydraulicProfileDocument()
  const persistedWorkspaces = useMemo(() => [
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
  ], [
    hydraulicProfiles.hydrate,
    hydraulicProfiles.snapshot,
    reportAssembly.document,
    reportAssembly.load,
  ])
  const projectLifecycle = useHydraulicProjectLifecycle({
    workspaces: persistedWorkspaces,
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
