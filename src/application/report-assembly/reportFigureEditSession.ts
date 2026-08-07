import type {
  ReportAssemblyDocument,
  ReportFigureArtifact,
} from '../../core/types'
import { flattenReportFigures } from './reportAssembly'

export type ReportFigureEditTargets = Readonly<Record<string, string>>

export function linkReportFigureEditTarget(
  targets: ReportFigureEditTargets,
  figure: Pick<ReportFigureArtifact, 'id' | 'workspaceId'>,
): ReportFigureEditTargets {
  return { ...targets, [figure.workspaceId]: figure.id }
}

export function unlinkReportFigureEditTarget(
  targets: ReportFigureEditTargets,
  workspaceId: string,
): ReportFigureEditTargets {
  const next = { ...targets }
  delete next[workspaceId]
  return next
}

export function resolveReportFigureEditTarget(
  document: ReportAssemblyDocument,
  targets: ReportFigureEditTargets,
  workspaceId: string,
): ReportFigureArtifact | null {
  const figureId = targets[workspaceId]
  if (!figureId) return null
  return flattenReportFigures(document).find(
    (figure) => figure.id === figureId && figure.workspaceId === workspaceId,
  ) ?? null
}

export function pruneReportFigureEditTargets(
  document: ReportAssemblyDocument,
  targets: ReportFigureEditTargets,
): ReportFigureEditTargets {
  const figures = new Map(
    flattenReportFigures(document).map((figure) => [figure.id, figure]),
  )
  return Object.fromEntries(
    Object.entries(targets).filter(([workspaceId, figureId]) =>
      figures.get(figureId)?.workspaceId === workspaceId,
    ),
  )
}
