import type { FigureObject } from '../../core/types'
import type { EditorCommand } from '../editor-history/editorCommand'
import {
  updateAdaptedFigureObject,
  type FigureObjectAdapter,
} from './figureObjectAdapter'

export function updateFigureObjectCommand<Item>({
  id,
  label,
  adapter,
  update,
  mergeKey,
}: {
  id: string
  label: string
  adapter: FigureObjectAdapter<Item>
  update(object: FigureObject): FigureObject
  mergeKey?: string
}): EditorCommand<Item[]> {
  return {
    label,
    mergeKey,
    apply: (current) =>
      updateAdaptedFigureObject(current, id, adapter, update),
  }
}
