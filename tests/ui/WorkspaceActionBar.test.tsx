import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Map } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { WorkspaceActionBar } from '../../src/components/settings/WorkspaceActionBar'

describe('WorkspaceActionBar', () => {
  it('presents one primary command with its readiness hint', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { rerender } = render(
      <WorkspaceActionBar
        icon={<Map aria-hidden="true" />}
        label="Generate map"
        disabled
        hint="Add one complete scenario first"
        onClick={onClick}
      />,
    )

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Generate map' })).toBeDisabled()
    expect(screen.getByText('Add one complete scenario first')).toBeVisible()

    rerender(
      <WorkspaceActionBar
        icon={<Map aria-hidden="true" />}
        label="Generate map"
        onClick={onClick}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Generate map' }))

    expect(onClick).toHaveBeenCalledOnce()
  })
})
