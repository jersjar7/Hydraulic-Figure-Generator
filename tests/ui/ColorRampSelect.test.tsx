import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ColorRampSelect } from '../../src/components/settings/ColorRampSelect'
import type { ColorRampKey } from '../../src/core/colorRamps'

function Harness() {
  const [ramp, setRamp] = useState<ColorRampKey>('wseDifference')
  return (
    <ColorRampSelect
      value={ramp}
      defaultRamp="wseDifference"
      onChange={setRamp}
    />
  )
}

describe('ColorRampSelect', () => {
  it('renders the shared visual catalog and resets to the figure default', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'WSE Difference' }))
    expect(screen.getAllByRole('option')).toHaveLength(9)

    fireEvent.click(screen.getByRole('option', { name: /Velocity/ }))
    expect(screen.getByRole('button', { name: 'Velocity' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', {
      name: 'Reset color ramp to WSE Difference',
    }))
    expect(screen.getByRole('button', { name: 'WSE Difference' })).toBeVisible()
  })
})
