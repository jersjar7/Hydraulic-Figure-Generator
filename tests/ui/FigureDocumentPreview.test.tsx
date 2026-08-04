import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createDefaultFigureDocumentSettings } from '../../src/core/types'
import { PlanViewFigureDocumentPanel } from '../../src/features/plan-view-results/PlanViewFigureDocumentPanel'
import { PlanViewFigureDocumentPreview } from '../../src/features/plan-view-results/PlanViewFigureDocumentPreview'
import { createDefaultPlanViewResultSettings } from '../../src/features/plan-view-results/planViewResultSettings'
import type { usePlanViewFigureDocument } from '../../src/features/plan-view-results/usePlanViewFigureDocument'

const item = {
  id: 'figure-1',
  recipeId: 'plan-view-scalar-results',
  figureId: 'plan-view-hydraulic-results',
  title: 'Existing - 100YR - Water Depth',
  caption: 'Modeled water depth.',
  included: true,
  selection: {
    scenarioId: 'EX',
    runIndex: 0,
    resultParameter: 'Water_Depth_ft',
  },
  settings: createDefaultPlanViewResultSettings(),
}

const page = {
  id: item.id,
  title: item.title,
  caption: item.caption,
  figureNumber: 4,
  thumbnailUrl: 'preview.png',
  item,
}

describe('figure document assembly UI', () => {
  it('shows page framing and selects a preview page', () => {
    const onSelect = vi.fn()
    render(
      <PlanViewFigureDocumentPreview
        title="Site 6 Results"
        orientation="portrait"
        pages={[page]}
        selectedPageId={null}
        onSelect={onSelect}
      />,
    )

    expect(screen.getByText('1 page · one figure per page')).toBeInTheDocument()
    const preview = screen.getByRole('button', { name: /Edit 4/ })
    expect(preview).toHaveClass('portrait')
    fireEvent.click(preview)
    expect(onSelect).toHaveBeenCalledWith('figure-1')
  })

  it('edits a selected caption and exposes ordering controls', () => {
    const updateCaption = vi.fn()
    const moveItem = vi.fn()
    const onManageFigures = vi.fn()
    const controller = {
      settings: createDefaultFigureDocumentSettings(),
      pages: [page, { ...page, id: 'figure-2', figureNumber: 5 }],
      selectedPage: page,
      updateSettings: vi.fn(),
      updateCaption,
      moveItem,
    } as unknown as ReturnType<typeof usePlanViewFigureDocument>
    render(
      <PlanViewFigureDocumentPanel
        controller={controller}
        onManageFigures={onManageFigures}
      />,
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Caption' }), {
      target: { value: 'Revised caption.' },
    })
    expect(updateCaption).toHaveBeenCalledWith('figure-1', 'Revised caption.')
    fireEvent.click(screen.getByRole('button', { name: 'Move down' }))
    expect(moveItem).toHaveBeenCalledWith('figure-1', 1)
    fireEvent.click(screen.getByRole('button', { name: 'Manage figures' }))
    expect(onManageFigures).toHaveBeenCalledOnce()
  })
})
