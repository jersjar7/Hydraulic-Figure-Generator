import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DiagnosticsWidget } from '../../src/components/DiagnosticsWidget'

describe('DiagnosticsWidget', () => {
  it('keeps messages available while the list is minimized', async () => {
    const user = userEvent.setup()
    render(
      <DiagnosticsWidget
        notices={[
          { level: 'success', text: 'Geometry loaded.' },
          { level: 'warning', text: 'Review one assessment line.' },
        ]}
      />,
    )
    const trigger = screen.getByRole('button', {
      name: /open diagnostics \(2 messages\)/i,
    })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Review one assessment line.')).not.toBeVisible()

    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Geometry loaded.')).toBeVisible()
    expect(screen.getByText('Review one assessment line.')).toBeVisible()
  })
})
