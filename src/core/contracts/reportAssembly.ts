import type { WorkspaceDraftSnapshot } from './workspaceDraft'

export type ReportFigureArtifact = {
  id: string
  workspaceId: string
  workspaceLabel: string
  title: string
  caption: string
  imageDataUrl: string
  widthPx: number
  heightPx: number
  createdAt: string
  workspaceDraft: WorkspaceDraftSnapshot | null
}

export type ReportWorkspaceGroup = {
  workspaceId: string
  workspaceLabel: string
  figures: ReportFigureArtifact[]
}

export type ReportAssemblyDocument = {
  version: 2
  title: string
  groups: ReportWorkspaceGroup[]
}

export type NewReportFigure = Omit<ReportFigureArtifact, 'id' | 'createdAt'>
