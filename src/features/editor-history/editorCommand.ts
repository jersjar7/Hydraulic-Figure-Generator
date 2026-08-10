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

export type EditorHistoryChange<State> = {
  label: string
  before: State
  after: State
  mergeKey?: string
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

export function commitEditorHistoryChange<State>(
  history: EditorHistory<State>,
  change: EditorHistoryChange<State>,
  limit = 50,
): { history: EditorHistory<State>; value: State } {
  if (Object.is(change.before, change.after)) {
    return { history, value: change.after }
  }
  const previous = history.past.at(-1)
  const shouldMerge =
    Boolean(change.mergeKey) &&
    previous?.mergeKey === change.mergeKey
  const entry: EditorHistoryEntry<State> = {
    label: change.label,
    before: shouldMerge && previous ? previous.before : change.before,
    after: change.after,
    mergeKey: change.mergeKey,
  }
  return {
    value: change.after,
    history: {
      past: [
        ...(shouldMerge ? history.past.slice(0, -1) : history.past),
        entry,
      ].slice(-limit),
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
