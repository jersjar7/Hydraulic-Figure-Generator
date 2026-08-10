import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  commitEditorHistoryChange,
  createEditorHistory,
  executeEditorCommand,
  redoEditorCommand,
  undoEditorCommand,
  type EditorCommand,
  type EditorHistoryChange,
} from './editorCommand'

type Options<State> = {
  value: State
  onChange: Dispatch<SetStateAction<State>>
  limit?: number
}

export function useEditorCommandHistory<State>({
  value,
  onChange,
  limit = 50,
}: Options<State>) {
  const valueRef = useRef(value)
  const historyRef = useRef(createEditorHistory<State>())
  const [, setRevision] = useState(0)
  valueRef.current = value

  const execute = useCallback(
    (command: EditorCommand<State>) => {
      const result = executeEditorCommand(
        historyRef.current,
        valueRef.current,
        command,
        limit,
      )
      if (Object.is(result.value, valueRef.current)) return result.value

      valueRef.current = result.value
      historyRef.current = result.history
      onChange(result.value)
      setRevision((current) => current + 1)
      return result.value
    },
    [limit, onChange],
  )

  const undo = useCallback(() => {
    const result = undoEditorCommand(historyRef.current)
    if (result.value === null) return null

    valueRef.current = result.value
    historyRef.current = result.history
    onChange(result.value)
    setRevision((current) => current + 1)
    return result.value
  }, [onChange])

  const commit = useCallback(
    (change: EditorHistoryChange<State>) => {
      const result = commitEditorHistoryChange(
        historyRef.current,
        change,
        limit,
      )
      valueRef.current = result.value
      historyRef.current = result.history
      onChange(result.value)
      setRevision((current) => current + 1)
      return result.value
    },
    [limit, onChange],
  )

  const redo = useCallback(() => {
    const result = redoEditorCommand(historyRef.current)
    if (result.value === null) return null

    valueRef.current = result.value
    historyRef.current = result.history
    onChange(result.value)
    setRevision((current) => current + 1)
    return result.value
  }, [onChange])

  const clear = useCallback(() => {
    historyRef.current = createEditorHistory<State>()
    setRevision((current) => current + 1)
  }, [])

  return {
    execute,
    commit,
    undo,
    redo,
    clear,
    canUndo: historyRef.current.past.length > 0,
    canRedo: historyRef.current.future.length > 0,
    undoLabel: historyRef.current.past.at(-1)?.label ?? null,
    redoLabel: historyRef.current.future[0]?.label ?? null,
  }
}
