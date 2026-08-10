import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useFigureObjectKeyboard } from '../../src/features/figure-objects/useFigureObjectKeyboard'

function KeyboardHarness({
  hasSelection = true,
  onCancel = vi.fn(),
  onDelete = vi.fn(),
  onNudge = vi.fn(),
  onUndo = vi.fn(),
  onRedo = vi.fn(),
}: {
  hasSelection?: boolean
  onCancel?: () => void
  onDelete?: () => void
  onNudge?: (dx: number, dy: number) => void
  onUndo?: () => void
  onRedo?: () => void
}) {
  useFigureObjectKeyboard({
    enabled: true,
    hasSelection,
    onCancel,
    onDelete,
    onNudge,
    onUndo,
    onRedo,
  })
  return <input aria-label="Text editor" />
}

describe('figure-object keyboard controls', () => {
  it('nudges, deletes, cancels, and routes history shortcuts', () => {
    const onCancel = vi.fn()
    const onDelete = vi.fn()
    const onNudge = vi.fn()
    const onUndo = vi.fn()
    const onRedo = vi.fn()
    render(
      <KeyboardHarness
        onCancel={onCancel}
        onDelete={onDelete}
        onNudge={onNudge}
        onUndo={onUndo}
        onRedo={onRedo}
      />,
    )

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowUp', shiftKey: true })
    fireEvent.keyDown(window, { key: 'Delete' })
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true })

    expect(onNudge).toHaveBeenNthCalledWith(1, 1, 0)
    expect(onNudge).toHaveBeenNthCalledWith(2, 0, -10)
    expect(onDelete).toHaveBeenCalledOnce()
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onUndo).toHaveBeenCalledOnce()
    expect(onRedo).toHaveBeenCalledOnce()
  })

  it('does not trigger figure shortcuts while editing a field', () => {
    const onDelete = vi.fn()
    const onNudge = vi.fn()
    render(
      <KeyboardHarness onDelete={onDelete} onNudge={onNudge} />,
    )
    const input = screen.getByRole('textbox', { name: 'Text editor' })

    fireEvent.keyDown(input, { key: 'ArrowRight' })
    fireEvent.keyDown(input, { key: 'Delete' })

    expect(onNudge).not.toHaveBeenCalled()
    expect(onDelete).not.toHaveBeenCalled()
  })
})
