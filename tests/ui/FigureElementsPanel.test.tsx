import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FigureElementsPanel } from '../../src/components/FigureElementsPanel'
import { createDefaultFigureSettings } from '../../src/core/defaults'

function renderPanel() {
  const onActiveElementChange = vi.fn()
  const onVisibilityChange = vi.fn()
  render(
    <FigureElementsPanel
      settings={createDefaultFigureSettings()}
      activeElement="title"
      onActiveElementChange={onActiveElementChange}
      onVisibilityChange={onVisibilityChange}
      onTitleTemplateChange={vi.fn()}
      onStyleChange={vi.fn()}
      onPositionChange={vi.fn()}
      onNudge={vi.fn()}
      onResetElement={vi.fn()}
    />,
  )
  return { onActiveElementChange, onVisibilityChange }
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
})
