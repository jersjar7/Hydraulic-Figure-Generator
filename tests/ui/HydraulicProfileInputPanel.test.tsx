import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildHydraulicProfileDataset } from '../../src/core/hydraulic-profiles/buildHydraulicProfileDataset'
import { HydraulicProfileInputPanel } from '../../src/features/hydraulic-profiles/HydraulicProfileInputPanel'

const series = [
  { id: 'line-1', sourceIndex: 0, distances: [0, 10], elevations: [28, 28] },
  { id: 'line-2', sourceIndex: 1, distances: [0, 10], elevations: [27, 25] },
  { id: 'line-3', sourceIndex: 2, distances: [0, 10], elevations: [29, 29] },
  { id: 'line-4', sourceIndex: 3, distances: [0, 10], elevations: [30, 30] },
]

describe('HydraulicProfileInputPanel', () => {
  it('shows inferred structure, then lets the engineer define every line', async () => {
    const user = userEvent.setup()
    const dataset = buildHydraulicProfileDataset(
      series,
      [{ reach: 'Site2', station: 44, zMinimum: 25 }],
      {},
    )
    const onDatasetConfigurationChange = vi.fn()
    render(
      <HydraulicProfileInputPanel
        mobileOpen={false}
        collapsed={false}
        conditionLabel="Proposed"
        summaryText="summary"
        profileText="profile"
        dataset={dataset}
        selectedSectionId="profile-section-1"
        onConditionLabelChange={vi.fn()}
        onSummaryTextChange={vi.fn()}
        onProfileTextChange={vi.fn()}
        onSelectedSectionChange={vi.fn()}
        onDatasetConfigurationChange={onDatasetConfigurationChange}
        onCollapse={vi.fn()}
        onExpand={vi.fn()}
        onMobileClose={vi.fn()}
        onReset={vi.fn()}
      />,
    )

    expect(screen.getByText(/Detected 4 datasets per section/)).toBeVisible()
    await user.click(screen.getByRole('tab', { name: 'Review' }))
    expect(screen.getAllByRole('combobox', { name: /Dataset \d type/ })).toHaveLength(4)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Dataset 2 type' }), 'ground')
    expect(onDatasetConfigurationChange).toHaveBeenLastCalledWith(expect.objectContaining({
      definitions: expect.arrayContaining([
        expect.objectContaining({ slot: 1, kind: 'ground' }),
      ]),
    }))
  })
})
