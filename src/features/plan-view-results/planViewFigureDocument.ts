import type {
  FigureDocumentPage,
  FigureDocumentSettings,
  FigureSetItemRuntime,
} from '../../core/types'
import type {
  PlanViewFigureSetDocument,
  PlanViewFigureSetItem,
} from './planViewFigureSet'

export type PlanViewFigureDocumentPage = FigureDocumentPage & {
  item: PlanViewFigureSetItem
}

export function buildPlanViewFigureDocumentPages(
  figureSet: PlanViewFigureSetDocument,
  runtime: Record<string, FigureSetItemRuntime>,
  settings: FigureDocumentSettings,
): PlanViewFigureDocumentPage[] {
  return figureSet.items
    .filter((item) => item.included)
    .map((item, index) => ({
      id: item.id,
      title: item.title,
      caption: item.caption,
      figureNumber: settings.startingFigureNumber + index,
      thumbnailUrl: runtime[item.id]?.thumbnailUrl,
      item,
    }))
}

export function movePlanViewFigureSetItem(
  document: PlanViewFigureSetDocument,
  id: string,
  direction: -1 | 1,
) {
  const index = document.items.findIndex((item) => item.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= document.items.length) return document
  const items = [...document.items]
  const [item] = items.splice(index, 1)
  items.splice(target, 0, item)
  return { ...document, items }
}

export function figureDocumentFileName(name: string) {
  const stem = name.trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
  return `${stem || 'Hydraulic_Figure_Set'}.docx`
}
