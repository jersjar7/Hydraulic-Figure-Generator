import { exportFigureDocument } from '../../application/documents/exportFigureDocument'
import type { WordDocumentImage } from '../../application/ports/wordDocument'
import { flattenReportFigures } from '../../application/report-assembly/reportAssembly'
import {
  createDefaultFigureDocumentSettings,
  type ReportAssemblyDocument,
  type ReportFigureArtifact,
} from '../../core/types'
import { browserBinaryFilePort } from '../../infrastructure/browser/browserBinaryFilePort'

function imageBytes(figure: ReportFigureArtifact): WordDocumentImage {
  const encoded = figure.imageDataUrl.slice(figure.imageDataUrl.indexOf(',') + 1)
  const binary = atob(encoded)
  const data = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) data[index] = binary.charCodeAt(index)
  return { data, widthPx: figure.widthPx, heightPx: figure.heightPx }
}

function fileName(title: string) {
  const stem = title.trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')
  return `${stem || 'Hydraulic_Figure_Report'}.docx`
}

export async function exportReportAssembly(
  document: ReportAssemblyDocument,
  onProgress?: (completed: number, total: number) => void,
) {
  const figures = flattenReportFigures(document)
  if (figures.length === 0) throw new Error('Add at least one figure before exporting.')
  const { docxWordDocumentPort } = await import(
    '../../infrastructure/documents/docxWordDocumentPort'
  )
  return exportFigureDocument({
    items: figures,
    settings: {
      ...createDefaultFigureDocumentSettings(),
      title: document.title,
    },
    fileName: fileName(document.title),
    render: async (figure) => imageBytes(figure),
    writer: docxWordDocumentPort,
    files: browserBinaryFilePort,
    onProgress,
  })
}
