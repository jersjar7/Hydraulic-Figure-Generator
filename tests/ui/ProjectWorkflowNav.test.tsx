import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProjectWorkflowNav } from '../../src/components/project-data/ProjectWorkflowNav'

const statuses = {
  models: { badge: 2, tone: 'ready' as const },
  layers: { badge: 1, tone: 'neutral' as const },
  assessment: { tone: 'warning' as const },
  review: { badge: 4, tone: 'ready' as const },
}

describe('ProjectWorkflowNav', () => {
  it('selects a project workspace with the pointer', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <ProjectWorkflowNav
        active="models"
        collapsed={false}
        statuses={statuses}
        onExpand={vi.fn()}
        onSelect={onSelect}
      />,
    )

    await user.click(screen.getByRole('tab', { name: /layers/i }))

    expect(onSelect).toHaveBeenCalledWith('layers')
  })

  it('supports roving keyboard navigation', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <ProjectWorkflowNav
        active="models"
        collapsed={false}
        statuses={statuses}
        onExpand={vi.fn()}
        onSelect={onSelect}
      />,
    )
    const models = screen.getByRole('tab', { name: /models/i })
    models.focus()

    await user.keyboard('{ArrowRight}')

    expect(onSelect).toHaveBeenCalledWith('layers')
    expect(screen.getByRole('tab', { name: /layers/i })).toHaveFocus()
  })

  it('expands the project rail when a collapsed workspace is chosen', async () => {
    const user = userEvent.setup()
    const onExpand = vi.fn()
    const onSelect = vi.fn()
    render(
      <ProjectWorkflowNav
        active="models"
        collapsed
        statuses={statuses}
        onExpand={onExpand}
        onSelect={onSelect}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: 'Shapefile overlays' }),
    )

    expect(onSelect).toHaveBeenCalledWith('layers')
    expect(onExpand).toHaveBeenCalledOnce()
  })
})
