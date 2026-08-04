import type { FigureDocumentSettings } from '../../core/types'
import type {
  WordDocumentImage,
  WordDocumentPort,
  WordDocumentPage,
} from '../ports/wordDocument'
import type { BinaryFilePort } from '../ports/fileGateways'

export type FigureDocumentSource = {
  id: string
  title: string
  caption: string
}

type Options<Item extends FigureDocumentSource> = {
  items: Item[]
  settings: FigureDocumentSettings
  fileName: string
  signal?: AbortSignal
  render(item: Item, signal?: AbortSignal): Promise<WordDocumentImage>
  writer: WordDocumentPort
  files: BinaryFilePort
  onProgress?(completed: number, total: number): void
}

export async function exportFigureDocument<Item extends FigureDocumentSource>({
  items,
  settings,
  fileName,
  signal,
  render,
  writer,
  files,
  onProgress,
}: Options<Item>) {
  const pages: WordDocumentPage[] = []
  for (const [index, item] of items.entries()) {
    if (signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError')
    pages.push({
      figureNumber: settings.startingFigureNumber + index,
      title: item.title,
      caption: item.caption,
      image: await render(item, signal),
    })
    onProgress?.(index + 1, items.length)
  }
  if (signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError')
  const contents = await writer.create({ settings, pages })
  files.downloadBinary({
    contents,
    fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  return { pageCount: pages.length }
}
