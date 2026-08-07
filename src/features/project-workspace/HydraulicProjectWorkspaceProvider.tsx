import { useMemo, useState, type ReactNode } from 'react'
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
import type { AppWorkspaceId } from './hydraulicProjectWorkspaceContext'
import { HydraulicProjectWorkspaceContext } from './hydraulicProjectWorkspaceContext'
import { useWorkspaceEditingSession } from './useWorkspaceEditingSession'

export function HydraulicProjectWorkspaceProvider({
  children,
}: {
  children: ReactNode
}) {
  const [activeFigureId, setActiveFigureId] = useState<AppWorkspaceId>(
    DEFAULT_FIGURE_WORKSPACE.id,
  )
  const projectSession = useProjectSession()
  const projectDocument = useHydraulicProjectDocument()
  const reportAssembly = useReportAssembly()
  const hydraulicProfiles = useHydraulicProfileDocument()
  const editingSession = useWorkspaceEditingSession({
    reportDocument: reportAssembly.document,
    projectSession,
    setActiveWorkspace: setActiveFigureId,
  })
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
    editingSession.folderBinding,
  ], [
    editingSession.folderBinding,
    hydraulicProfiles.hydrate,
    hydraulicProfiles.snapshot,
    reportAssembly.document,
    reportAssembly.load,
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
  return (
    <HydraulicProjectWorkspaceContext.Provider
      value={{
        activeFigureId,
        setActiveFigureId,
        projectSession,
        projectDocument,
        reportAssembly,
        hydraulicProfiles,
        workspaceDrafts: editingSession.workspaceDrafts,
        reportFigureEditTargets: editingSession.reportFigureEditTargets,
        linkReportFigureEditTarget: editingSession.linkReportFigureEditTarget,
        unlinkReportFigureEditTarget: editingSession.unlinkReportFigureEditTarget,
        openReportFigureDraft: editingSession.openReportFigureDraft,
        projectLifecycle,
      }}
    >
      {children}
    </HydraulicProjectWorkspaceContext.Provider>
  )
}
