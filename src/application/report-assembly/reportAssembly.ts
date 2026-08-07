import type {
  NewReportFigure,
  ReportAssemblyDocument,
  ReportFigureArtifact,
} from '../../core/types'

export function createReportAssemblyDocument(): ReportAssemblyDocument {
  return { version: 2, title: 'Hydraulic Figure Report', groups: [] }
}

export function addReportFigure(
  document: ReportAssemblyDocument,
  figure: ReportFigureArtifact,
): ReportAssemblyDocument {
  const groupIndex = document.groups.findIndex(
    (group) => group.workspaceId === figure.workspaceId,
  )
  if (groupIndex < 0) {
    return {
      ...document,
      groups: [...document.groups, {
        workspaceId: figure.workspaceId,
        workspaceLabel: figure.workspaceLabel,
        figures: [figure],
      }],
    }
  }
  return {
    ...document,
    groups: document.groups.map((group, index) => index === groupIndex
      ? { ...group, figures: [...group.figures, figure] }
      : group),
  }
}

export function removeReportFigure(
  document: ReportAssemblyDocument,
  figureId: string,
): ReportAssemblyDocument {
  return {
    ...document,
    groups: document.groups
      .map((group) => ({
        ...group,
        figures: group.figures.filter((figure) => figure.id !== figureId),
      }))
      .filter((group) => group.figures.length > 0),
  }
}

export function updateReportFigure(
  document: ReportAssemblyDocument,
  figureId: string,
  update: Partial<Pick<ReportFigureArtifact, 'title' | 'caption'>>,
): ReportAssemblyDocument {
  return {
    ...document,
    groups: document.groups.map((group) => ({
      ...group,
      figures: group.figures.map((figure) => figure.id === figureId
        ? { ...figure, ...update }
        : figure),
    })),
  }
}

export function replaceReportFigure(
  document: ReportAssemblyDocument,
  replacement: ReportFigureArtifact,
): ReportAssemblyDocument {
  const existing = flattenReportFigures(document).find(
    (figure) => figure.id === replacement.id,
  )
  if (!existing) {
    throw new Error('The exported figure is no longer in the Export Collection.')
  }
  if (existing.workspaceId !== replacement.workspaceId) {
    throw new Error('An exported figure cannot be moved to another workspace.')
  }
  return {
    ...document,
    groups: document.groups.map((group) => ({
      ...group,
      figures: group.figures.map((figure) => figure.id === replacement.id
        ? replacement
        : figure),
    })),
  }
}

function moveBefore<T>(items: T[], sourceIndex: number, targetIndex: number) {
  if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0) return items
  const next = [...items]
  const [source] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, source)
  return next
}

export function moveReportFigure(
  document: ReportAssemblyDocument,
  workspaceId: string,
  sourceId: string,
  targetId: string,
): ReportAssemblyDocument {
  return {
    ...document,
    groups: document.groups.map((group) => {
      if (group.workspaceId !== workspaceId) return group
      return {
        ...group,
        figures: moveBefore(
          group.figures,
          group.figures.findIndex((figure) => figure.id === sourceId),
          group.figures.findIndex((figure) => figure.id === targetId),
        ),
      }
    }),
  }
}

export function moveReportFigureBy(
  document: ReportAssemblyDocument,
  workspaceId: string,
  figureId: string,
  delta: number,
): ReportAssemblyDocument {
  const group = document.groups.find((candidate) => candidate.workspaceId === workspaceId)
  if (!group) return document
  const sourceIndex = group.figures.findIndex((figure) => figure.id === figureId)
  const target = group.figures[Math.max(0, Math.min(group.figures.length - 1, sourceIndex + delta))]
  return target ? moveReportFigure(document, workspaceId, figureId, target.id) : document
}

export function moveReportWorkspace(
  document: ReportAssemblyDocument,
  sourceId: string,
  targetId: string,
): ReportAssemblyDocument {
  return {
    ...document,
    groups: moveBefore(
      document.groups,
      document.groups.findIndex((group) => group.workspaceId === sourceId),
      document.groups.findIndex((group) => group.workspaceId === targetId),
    ),
  }
}

export function moveReportWorkspaceBy(
  document: ReportAssemblyDocument,
  workspaceId: string,
  delta: number,
): ReportAssemblyDocument {
  const sourceIndex = document.groups.findIndex((group) => group.workspaceId === workspaceId)
  const target = document.groups[Math.max(0, Math.min(document.groups.length - 1, sourceIndex + delta))]
  return target ? moveReportWorkspace(document, workspaceId, target.workspaceId) : document
}

export function flattenReportFigures(document: ReportAssemblyDocument) {
  return document.groups.flatMap((group) => group.figures)
}

export function createReportFigure(
  input: NewReportFigure,
  id: string = globalThis.crypto?.randomUUID?.() ?? `figure-${Date.now()}-${Math.random()}`,
  createdAt = new Date().toISOString(),
): ReportFigureArtifact {
  if (
    input.workspaceDraft &&
    (
      input.workspaceDraft.workspaceId !== input.workspaceId ||
      !Number.isInteger(input.workspaceDraft.schemaVersion) ||
      input.workspaceDraft.schemaVersion < 1
    )
  ) {
    throw new Error('The workspace draft does not match its report figure.')
  }
  return {
    ...input,
    workspaceDraft: input.workspaceDraft
      ? { ...input.workspaceDraft }
      : null,
    id,
    createdAt,
  }
}

export function createReplacementReportFigure(
  existing: ReportFigureArtifact,
  input: NewReportFigure,
): ReportFigureArtifact {
  if (existing.workspaceId !== input.workspaceId) {
    throw new Error('An exported figure cannot be replaced by another workspace.')
  }
  return createReportFigure(input, existing.id, existing.createdAt)
}
