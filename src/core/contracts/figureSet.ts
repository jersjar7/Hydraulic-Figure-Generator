export type FigureSetItemStatus =
  | 'queued'
  | 'generating'
  | 'ready'
  | 'stale'
  | 'error'

export type FigureSetItem<Selection, Settings> = {
  id: string
  recipeId: string
  figureId: string
  title: string
  caption: string
  included: boolean
  selection: Selection
  settings: Settings
}

export type FigureSetDocument<Item> = {
  id: string
  name: string
  items: Item[]
}

export type FigureSetItemRuntime = {
  status: FigureSetItemStatus
  thumbnailUrl?: string
  error?: string
}

export type GeneratedFigure<Scene> = {
  scene: Scene
  thumbnailUrl: string
}
