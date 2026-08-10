import type {
  FigureObject,
  FigureObjectSelection,
} from '../../core/types'

export function selectFigureObject(
  objects: readonly FigureObject[],
  id: string | null,
): FigureObjectSelection {
  if (!id) return { selectedId: null }
  const selected = objects.find((object) => object.id === id)
  return { selectedId: selected?.visible ? selected.id : null }
}

export function removeFigureObject(
  objects: readonly FigureObject[],
  id: string,
) {
  const index = objects.findIndex((object) => object.id === id)
  if (index < 0) {
    return { objects: [...objects], selectedId: null }
  }
  const nextSelection = objects[index + 1] ?? objects[index - 1] ?? null
  return {
    objects: objects.filter((object) => object.id !== id),
    selectedId: nextSelection?.id ?? null,
  }
}

export function resetFigureObject(
  objects: readonly FigureObject[],
  baseline: FigureObject,
) {
  return objects.map((object) =>
    object.id === baseline.id ? baseline : object,
  )
}
