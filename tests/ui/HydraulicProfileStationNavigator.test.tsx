import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { HydraulicProfileScene } from '../../src/core/types'
import { HydraulicProfileStationNavigator } from '../../src/features/hydraulic-profiles/HydraulicProfileStationNavigator'

const scenes = [
  { section: { id: 'section-1', stationLabel: '1+00' } },
  { section: { id: 'section-2', stationLabel: '2+00' } },
  { section: { id: 'section-3', stationLabel: '3+00' } },
] as HydraulicProfileScene[]

function Navigator() {
  const [selected, setSelected] = useState('section-1')
  return <HydraulicProfileStationNavigator
    scenes={scenes}
    selectedSectionId={selected}
    onSelect={setSelected}
  />
}

describe('HydraulicProfileStationNavigator', () => {
  it('moves among every generated station without regenerating', async () => {
    const user = userEvent.setup()
    render(<Navigator />)

    expect(screen.getByText('1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '1+00' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Previous station' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next station' }))
    expect(screen.getByText('2 of 3')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '2+00' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('tab', { name: '3+00' }))
    expect(screen.getByText('3 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next station' })).toBeDisabled()
  })
})
