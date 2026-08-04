import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FigureProductionModeSwitcher } from '../../src/features/figure-sets/FigureProductionModeSwitcher'
import { PlanViewFigureSetGallery } from '../../src/features/plan-view-results/PlanViewFigureSetGallery'
import { createPlanViewFigureSetDocument } from '../../src/features/plan-view-results/planViewFigureSet'
import { createDefaultPlanViewResultSettings } from '../../src/features/plan-view-results/planViewResultSettings'

const item = {
  id: 'figure-1',
  recipeId: 'plan-view-scalar-results',
  figureId: 'plan-view-hydraulic-results',
  title: 'Existing - 100YR - Water Depth',
  caption: 'Water depth for Existing 100YR',
  included: true,
  selection: {
    scenarioId: 'EX',
    runIndex: 0,
    resultParameter: 'Water_Depth_ft',
  },
  settings: createDefaultPlanViewResultSettings(),
}

describe('figure-set review UI', () => {
  it('switches between figure and set production views', () => {
    const onChange = vi.fn()
    render(<FigureProductionModeSwitcher value="figure" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Figure Set' }))
    expect(onChange).toHaveBeenCalledWith('set')
  })

  it('opens and includes individual generated figures', () => {
    const onOpen = vi.fn()
    const onToggleIncluded = vi.fn()
    render(
      <PlanViewFigureSetGallery
        figureSet={{ ...createPlanViewFigureSetDocument(), items: [item] }}
        runtime={{
          'figure-1': { status: 'ready', thumbnailUrl: 'preview.png' },
        }}
        draftCount={1}
        onOpen={onOpen}
        onToggleIncluded={onToggleIncluded}
      />,
    )

    expect(screen.getByText('1 ready · 1 included · 1 total')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Open figure 1/ }))
    expect(onOpen).toHaveBeenCalledWith(item)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include in document' }))
    expect(onToggleIncluded).toHaveBeenCalledWith('figure-1')
  })
})
