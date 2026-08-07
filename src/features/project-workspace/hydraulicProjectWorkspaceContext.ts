import { createContext } from 'react'
import type { FigureId } from '../figures/workspaceRegistry'
import { REPORT_ASSEMBLY_WORKSPACE_ID } from '../report-assembly/reportAssemblyWorkspaceId'
import type { useHydraulicProjectDocument } from '../project-document/useHydraulicProjectDocument'
import type { useProjectSession } from '../project-session/useProjectSession'
import type { useReportAssembly } from '../report-assembly/useReportAssembly'
import type { useHydraulicProfileDocument } from '../hydraulic-profiles/useHydraulicProfileDocument'
import type { useHydraulicProjectLifecycle } from '../project-lifecycle/useHydraulicProjectLifecycle'
import type { WorkspaceDraftRepository } from '../figures/workspaceDraftRepository'
import type { ReportFigureArtifact } from '../../core/types'

export type AppWorkspaceId = FigureId | typeof REPORT_ASSEMBLY_WORKSPACE_ID

export type HydraulicProjectWorkspaceValue = {
  activeFigureId: AppWorkspaceId
  setActiveFigureId: (figureId: AppWorkspaceId) => void
  projectSession: ReturnType<typeof useProjectSession>
  projectDocument: ReturnType<typeof useHydraulicProjectDocument>
  reportAssembly: ReturnType<typeof useReportAssembly>
  hydraulicProfiles: ReturnType<typeof useHydraulicProfileDocument>
  workspaceDrafts: WorkspaceDraftRepository
  openReportFigureDraft(figure: ReportFigureArtifact): Promise<void>
  projectLifecycle: ReturnType<typeof useHydraulicProjectLifecycle>
}

export const HydraulicProjectWorkspaceContext =
  createContext<HydraulicProjectWorkspaceValue | null>(null)
