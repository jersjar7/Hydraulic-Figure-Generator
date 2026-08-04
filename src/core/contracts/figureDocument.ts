export type FigureDocumentOrientation = 'portrait' | 'landscape'

export type FigureDocumentSettings = {
  title: string
  orientation: FigureDocumentOrientation
  marginInches: number
  captionPrefix: string
  startingFigureNumber: number
}

export type FigureDocumentPage = {
  id: string
  title: string
  caption: string
  figureNumber: number
  thumbnailUrl?: string
}

export function createDefaultFigureDocumentSettings(): FigureDocumentSettings {
  return {
    title: 'Plan-View Hydraulic Results',
    orientation: 'landscape',
    marginInches: 0.5,
    captionPrefix: 'Figure',
    startingFigureNumber: 1,
  }
}
