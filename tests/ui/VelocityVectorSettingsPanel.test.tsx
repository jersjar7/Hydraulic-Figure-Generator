import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { VelocityVectorSettingsPanel } from '../../src/features/velocity-vectors/VelocityVectorSettingsPanel'
import { createDefaultPlanViewResultSettings } from '../../src/features/plan-view-results/planViewResultSettings'

function Harness({ available = true }: { available?: boolean }) {
  const [value, setValue] = useState(
    createDefaultPlanViewResultSettings().velocityVectors,
  )
  return (
    <VelocityVectorSettingsPanel
      value={value}
      available={available}
      onChange={setValue}
    />
  )
}

describe('VelocityVectorSettingsPanel', () => {
  it('explains when the selected run has no vector dataset', () => {
    render(<Harness available={false} />)
    expect(screen.getByLabelText('Show velocity arrows')).toBeDisabled()
    expect(screen.getByText(/does not include.*Velocity_ft_p_s/i)).toBeVisible()
  })

  it('reveals compact vector styling controls when enabled', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByLabelText('Show velocity arrows'))

    expect(screen.getByRole('button', { name: 'Uniform' })).toHaveClass('active')
    expect(screen.getByLabelText(/Spacing/)).toHaveValue(70)
    expect(screen.getByLabelText(/Length/)).toHaveValue(20)
    expect(screen.getByLabelText(/Minimum/)).toHaveValue(0)

    await user.click(screen.getByRole('button', { name: 'Scale by speed' }))
    expect(screen.getByRole('button', { name: 'Scale by speed' })).toHaveClass('active')
  })
})
