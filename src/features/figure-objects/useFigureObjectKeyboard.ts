import { useEffect } from 'react'

type FigureObjectKeyboardOptions = {
  enabled: boolean
  hasSelection: boolean
  onCancel(): void
  onDelete(): void
  onNudge(dx: number, dy: number): void
  onUndo(): void
  onRedo(): void
}

function isEditingText(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
}

export function useFigureObjectKeyboard({
  enabled,
  hasSelection,
  onCancel,
  onDelete,
  onNudge,
  onUndo,
  onRedo,
}: FigureObjectKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (isEditingText(event.target)) return
      if (event.key === 'Escape') {
        onCancel()
        return
      }
      if (
        hasSelection &&
        (event.key === 'Delete' || event.key === 'Backspace')
      ) {
        event.preventDefault()
        onDelete()
        return
      }
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) onRedo()
        else onUndo()
        return
      }
      if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        onRedo()
        return
      }
      if (!hasSelection || !event.key.startsWith('Arrow')) return
      const distance = event.shiftKey ? 10 : 1
      const delta = {
        ArrowLeft: [-distance, 0],
        ArrowRight: [distance, 0],
        ArrowUp: [0, -distance],
        ArrowDown: [0, distance],
      }[event.key]
      if (!delta) return
      event.preventDefault()
      onNudge(delta[0], delta[1])
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    enabled,
    hasSelection,
    onCancel,
    onDelete,
    onNudge,
    onRedo,
    onUndo,
  ])
}
