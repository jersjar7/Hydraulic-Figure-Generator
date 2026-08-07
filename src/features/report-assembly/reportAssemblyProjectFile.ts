import type {
  ReportAssemblyDocument,
  ReportFigureArtifact,
  ReportWorkspaceGroup,
  WorkspaceDraftSnapshot,
} from '../../core/types'

type SerializedReportAssembly = {
  version?: number
  title?: string
  groups?: ReportWorkspaceGroup[]
}

export function serializeReportAssembly(document: ReportAssemblyDocument) {
  return JSON.stringify(document, null, 2)
}

export function parseReportAssembly(text: string): ReportAssemblyDocument {
  const parsed = JSON.parse(text) as SerializedReportAssembly
  if (![1, 2].includes(Number(parsed.version)) || typeof parsed.title !== 'string' || !Array.isArray(parsed.groups)) {
    throw new Error('This is not a supported Export Collection file.')
  }
  const ids = new Set<string>()
  const groups = parsed.groups.map((group) => {
    if (
      !group ||
      typeof group.workspaceId !== 'string' ||
      typeof group.workspaceLabel !== 'string' ||
      !Array.isArray(group.figures)
    ) throw new Error('The Export Collection contains a malformed workspace group.')
    const figures = group.figures.map((figure) => {
      if (
        !figure ||
        typeof figure.id !== 'string' ||
        ids.has(figure.id) ||
        figure.workspaceId !== group.workspaceId ||
        typeof figure.title !== 'string' ||
        typeof figure.caption !== 'string' ||
        typeof figure.imageDataUrl !== 'string' ||
        !figure.imageDataUrl.startsWith('data:image/png;base64,') ||
        !Number.isFinite(figure.widthPx) ||
        figure.widthPx <= 0 ||
        !Number.isFinite(figure.heightPx) ||
        figure.heightPx <= 0 ||
        typeof figure.createdAt !== 'string'
      ) throw new Error('The Export Collection contains a malformed figure.')
      ids.add(figure.id)
      return {
        ...figure,
        workspaceDraft: parsed.version === 1
          ? null
          : parseWorkspaceDraft(figure.workspaceDraft, figure.workspaceId),
      } as ReportFigureArtifact
    })
    return { ...group, figures }
  })
  return { version: 2, title: parsed.title, groups }
}

function parseWorkspaceDraft(
  value: unknown,
  workspaceId: string,
): WorkspaceDraftSnapshot | null {
  if (value == null) return null
  if (!value || typeof value !== 'object') {
    throw new Error('The Export Collection contains a malformed workspace draft.')
  }
  const draft = value as Partial<WorkspaceDraftSnapshot>
  if (
    draft.workspaceId !== workspaceId ||
    !Number.isInteger(draft.schemaVersion) ||
    Number(draft.schemaVersion) < 1 ||
    typeof draft.source !== 'string'
  ) {
    throw new Error('The Export Collection contains a malformed workspace draft.')
  }
  return {
    workspaceId: draft.workspaceId,
    schemaVersion: Number(draft.schemaVersion),
    source: draft.source,
  }
}
