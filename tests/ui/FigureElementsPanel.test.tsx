import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FigureElementsPanel } from '../../src/components/FigureElementsPanel'
import { createDefaultFigureSettings } from '../../src/core/defaults'

function renderPanel() {
  const onActiveElementChange = vi.fn()
  const onVisibilityChange = vi.fn()
  const onLockChange = vi.fn()
  render(
    <FigureElementsPanel
      settings={createDefaultFigureSettings()}
      activeElement="title"
      onActiveElementChange={onActiveElementChange}
      onVisibilityChange={onVisibilityChange}
      onLockChange={onLockChange}
      onTitleTemplateChange={vi.fn()}
      onStyleChange={vi.fn()}
      onPositionChange={vi.fn()}
      onNudge={vi.fn()}
      onResetElement={vi.fn()}
      onUndo={vi.fn()}
      onRedo={vi.fn()}
      canUndo={false}
      canRedo={false}
      undoLabel={null}
      redoLabel={null}
    />,
  )
  return { onActiveElementChange, onVisibilityChange, onLockChange }
}

describe('FigureElementsPanel', () => {
  it('routes element tab selection through the parent workspace', async () => {
    const user = userEvent.setup()
    const { onActiveElementChange } = renderPanel()

    await user.click(screen.getByRole('tab', { name: /difference legend/i }))

    expect(onActiveElementChange).toHaveBeenCalledWith('diffLegend')
  })

  it('routes active element visibility changes without mutating settings', async () => {
    const user = userEvent.setup()
    const { onVisibilityChange } = renderPanel()

    await user.click(screen.getByRole('checkbox', { name: /show on figure/i }))

    expect(onVisibilityChange).toHaveBeenCalledWith('title', false)
  })

  it('routes position locking through the shared element controller', async () => {
    const user = userEvent.setup()
    const { onLockChange } = renderPanel()

    await user.click(screen.getByRole('checkbox', { name: /lock position/i }))

    expect(onLockChange).toHaveBeenCalledWith('title', true)
  })
})
