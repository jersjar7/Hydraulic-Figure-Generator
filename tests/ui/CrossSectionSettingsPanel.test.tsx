import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CrossSectionSettingsPanel } from '../../src/features/cross-section/CrossSectionSettingsPanel'
import { createDefaultCrossSectionSettings } from '../../src/features/cross-section/crossSectionSettings'

function renderPanel(drawing = false) {
  const callbacks = {
    onReverseLine: vi.fn(),
    onFlipViewSide: vi.fn(),
    onClearLine: vi.fn(),
    onStartDrawing: vi.fn(),
  }
  render(
    <CrossSectionSettingsPanel
      section="section"
      settings={createDefaultCrossSectionSettings()}
      assessmentLines={[]}
      selectedAssessmentLineId=""
      selectedLine={{
        id: 'manual-1',
        label: 'Manual Section 1',
        source: 'manual',
        lengthFeet: 42.4,
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        direction: 'a-to-b',
      }}
      drawing={drawing}
      canDownload={false}
      onSettingsChange={vi.fn()}
      onAssessmentLineChange={vi.fn()}
      onShowMap={vi.fn()}
      onDownload={vi.fn()}
      {...callbacks}
    />,
  )
  return callbacks
}

describe('CrossSectionSettingsPanel', () => {
  it('keeps selected-section actions together in a compact card', async () => {
    const user = userEvent.setup()
    const callbacks = renderPanel()

    expect(screen.getByTestId('selected-section-card')).toHaveTextContent(
      'Manual section · 42 ft',
    )
    await user.click(screen.getByRole('button', { name: 'Reverse A/B' }))
    await user.click(screen.getByRole('button', { name: 'Flip look arrow' }))
    await user.click(
      screen.getByRole('button', { name: 'Remove selected section' }),
    )

    expect(callbacks.onReverseLine).toHaveBeenCalledOnce()
    expect(callbacks.onFlipViewSide).toHaveBeenCalledOnce()
    expect(callbacks.onClearLine).toHaveBeenCalledOnce()
  })

  it('turns the drawing command into an explicit cancel action', async () => {
    const user = userEvent.setup()
    const callbacks = renderPanel(true)

    await user.click(screen.getByRole('button', { name: 'Cancel drawing' }))

    expect(callbacks.onStartDrawing).toHaveBeenCalledOnce()
  })
})
