import type { ReportAssemblyDocument } from '../../core/types'

export function serializeReportAssembly(document: ReportAssemblyDocument) {
  return JSON.stringify(document, null, 2)
}

export function parseReportAssembly(text: string): ReportAssemblyDocument {
  const parsed = JSON.parse(text) as Partial<ReportAssemblyDocument>
  if (parsed.version !== 1 || typeof parsed.title !== 'string' || !Array.isArray(parsed.groups)) {
    throw new Error('This is not a supported Export Collection file.')
  }
  const ids = new Set<string>()
  for (const group of parsed.groups) {
    if (
      !group ||
      typeof group.workspaceId !== 'string' ||
      typeof group.workspaceLabel !== 'string' ||
      !Array.isArray(group.figures)
    ) throw new Error('The Export Collection contains a malformed workspace group.')
    for (const figure of group.figures) {
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
        figure.heightPx <= 0
      ) throw new Error('The Export Collection contains a malformed figure.')
      ids.add(figure.id)
    }
  }
  return parsed as ReportAssemblyDocument
}
