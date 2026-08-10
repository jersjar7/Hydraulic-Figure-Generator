import type { FigureObject } from '../../core/types'

export type FigureObjectAdapter<Item> = Readonly<{
  toFigureObject(item: Item, index: number): FigureObject
  fromFigureObject(item: Item, object: FigureObject): Item
}>

export function updateAdaptedFigureObject<Item>(
  items: readonly Item[],
  id: string,
  adapter: FigureObjectAdapter<Item>,
  update: (object: FigureObject) => FigureObject,
): Item[] {
  return items.map((item, index) => {
    const object = adapter.toFigureObject(item, index)
    if (object.id !== id) return item
    const updated = update(object)
    return Object.is(updated, object)
      ? item
      : adapter.fromFigureObject(item, updated)
  })
}

export function appendAdaptedFigureObject<Item>(
  items: readonly Item[],
  sourceId: string,
  adapter: FigureObjectAdapter<Item>,
  duplicate: (object: FigureObject) => FigureObject,
): { items: Item[]; duplicate: Item | null } {
  const index = items.findIndex(
    (item, itemIndex) =>
      adapter.toFigureObject(item, itemIndex).id === sourceId,
  )
  const source = items[index]
  if (index < 0 || !source) {
    return { items: [...items], duplicate: null }
  }
  const copy = adapter.fromFigureObject(
    source,
    duplicate(adapter.toFigureObject(source, index)),
  )
  return { items: [...items, copy], duplicate: copy }
}

export function removeAdaptedFigureObject<Item>(
  items: readonly Item[],
  id: string,
  adapter: FigureObjectAdapter<Item>,
) {
  const index = items.findIndex(
    (item, itemIndex) =>
      adapter.toFigureObject(item, itemIndex).id === id,
  )
  if (index < 0) return { items: [...items], selectedId: null }
  const next = items[index + 1] ?? items[index - 1] ?? null
  return {
    items: items.filter(
      (item, itemIndex) =>
        adapter.toFigureObject(item, itemIndex).id !== id,
    ),
    selectedId: next
      ? adapter.toFigureObject(next, Math.max(0, index - 1)).id
      : null,
  }
}
