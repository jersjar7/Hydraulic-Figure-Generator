import type { FigureDocumentSettings } from '../../core/types'

export type WordDocumentImage = {
  data: Uint8Array
  widthPx: number
  heightPx: number
}

export type WordDocumentPage = {
  figureNumber: number
  title: string
  caption: string
  image: WordDocumentImage
}

export type WordDocumentRequest = {
  settings: FigureDocumentSettings
  pages: WordDocumentPage[]
}

export interface WordDocumentPort {
  create(request: WordDocumentRequest): Promise<ArrayBuffer>
}
