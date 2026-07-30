export type EditorCommand<State> = {
  label: string
  apply(current: State): State
  mergeKey?: string
}

export type EditorHistoryEntry<State> = {
  label: string
  before: State
  after: State
  mergeKey?: string
}

export type EditorHistory<State> = {
  past: EditorHistoryEntry<State>[]
  future: EditorHistoryEntry<State>[]
}

export function createEditorHistory<State>(): EditorHistory<State> {
  return {
    past: [],
    future: [],
  }
}

export function executeEditorCommand<State>(
  history: EditorHistory<State>,
  current: State,
  command: EditorCommand<State>,
  limit = 50,
): { history: EditorHistory<State>; value: State } {
  const value = command.apply(current)
  if (Object.is(value, current)) return { history, value }

  const previous = history.past.at(-1)
  const shouldMerge =
    Boolean(command.mergeKey) &&
    previous?.mergeKey === command.mergeKey
  const entry: EditorHistoryEntry<State> = {
    label: command.label,
    before: shouldMerge && previous ? previous.before : current,
    after: value,
    mergeKey: command.mergeKey,
  }
  const unchangedPast = shouldMerge
    ? history.past.slice(0, -1)
    : history.past

  return {
    value,
    history: {
      past: [...unchangedPast, entry].slice(-limit),
      future: [],
    },
  }
}

export function undoEditorCommand<State>(
  history: EditorHistory<State>,
): { history: EditorHistory<State>; value: State | null } {
  const entry = history.past.at(-1)
  if (!entry) return { history, value: null }

  return {
    value: entry.before,
    history: {
      past: history.past.slice(0, -1),
      future: [entry, ...history.future],
    },
  }
}

export function redoEditorCommand<State>(
  history: EditorHistory<State>,
): { history: EditorHistory<State>; value: State | null } {
  const entry = history.future[0]
  if (!entry) return { history, value: null }

  return {
    value: entry.after,
    history: {
      past: [...history.past, entry],
      future: history.future.slice(1),
    },
  }
}
