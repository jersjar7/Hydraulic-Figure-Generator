import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildHydraulicProfileDataset } from '../../src/core/hydraulic-profiles/buildHydraulicProfileDataset'
import { HydraulicProfileInputPanel } from '../../src/features/hydraulic-profiles/HydraulicProfileInputPanel'
import { createHydraulicProfilePresetConfiguration } from '../../src/features/hydraulic-profiles/hydraulicProfilePresets'

const series = [
  { id: 'line-1', sourceIndex: 0, distances: [0, 10], elevations: [28, 28] },
  { id: 'line-2', sourceIndex: 1, distances: [0, 10], elevations: [27, 25] },
  { id: 'line-3', sourceIndex: 2, distances: [0, 10], elevations: [29, 29] },
  { id: 'line-4', sourceIndex: 3, distances: [0, 10], elevations: [30, 30] },
]

describe('HydraulicProfileInputPanel', () => {
  it('applies condition presets and lets the engineer add datasets', async () => {
    const user = userEvent.setup()
    const configuration = createHydraulicProfilePresetConfiguration('existing')
    const dataset = buildHydraulicProfileDataset(
      series,
      [{ reach: 'Site2', station: 44, zMinimum: 25 }],
      { datasetConfiguration: configuration },
    )
    const onDatasetConfigurationChange = vi.fn()
    const onConditionLabelChange = vi.fn()
    render(
      <HydraulicProfileInputPanel
        mobileOpen={false}
        collapsed={false}
        conditionLabel="Proposed"
        summaryText="summary"
        profileText="profile"
        dataset={dataset}
        summaryRows={[{ reach: 'Site2', station: 44, zMinimum: 25 }]}
        selectedSectionId="profile-section-1"
        onConditionLabelChange={onConditionLabelChange}
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

    expect(screen.queryByPlaceholderText('Auto')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Existing' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Add dataset' }))
    expect(onDatasetConfigurationChange).toHaveBeenLastCalledWith(expect.objectContaining({
      datasetsPerSection: 5,
      definitions: expect.arrayContaining([
        expect.objectContaining({ slot: 4, name: 'Dataset 5', kind: 'other' }),
      ]),
    }))

    await user.click(screen.getByRole('button', { name: 'Proposed' }))
    expect(onConditionLabelChange).toHaveBeenLastCalledWith('Proposed Conditions')
    expect(onDatasetConfigurationChange).toHaveBeenLastCalledWith(expect.objectContaining({
      datasetsPerSection: 5,
      definitions: expect.arrayContaining([
        expect.objectContaining({ name: '2080 100-year', kind: 'wse' }),
      ]),
    }))
  })

  it('lets the engineer review and redefine every preset line', async () => {
    const user = userEvent.setup()
    const configuration = createHydraulicProfilePresetConfiguration('existing')
    const dataset = buildHydraulicProfileDataset(
      series,
      [{ reach: 'Site2', station: 44, zMinimum: 28 }],
      { datasetConfiguration: configuration },
    )
    const onDatasetConfigurationChange = vi.fn()
    render(
      <HydraulicProfileInputPanel
        mobileOpen={false}
        collapsed={false}
        conditionLabel="Existing Conditions"
        summaryText="summary"
        profileText="profile"
        dataset={dataset}
        summaryRows={[{ reach: 'Site2', station: 44, zMinimum: 28 }]}
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

    await user.click(screen.getByRole('tab', { name: 'Review' }))
    expect(screen.getAllByRole('combobox', { name: /Dataset \d type/ })).toHaveLength(4)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Dataset 2 type' }), 'ground')
    expect(onDatasetConfigurationChange).toHaveBeenLastCalledWith(expect.objectContaining({
      definitions: expect.arrayContaining([
        expect.objectContaining({ slot: 1, kind: 'ground' }),
      ]),
    }))
  })

  it('offers the best Summary Z-min match as an explicit station ground correction', async () => {
    const user = userEvent.setup()
    const configuration = createHydraulicProfilePresetConfiguration('existing')
    const summaryRows = [{ reach: 'Site2', station: 44, zMinimum: 25 }]
    const dataset = buildHydraulicProfileDataset(series, summaryRows, {
      datasetConfiguration: configuration,
    })
    const onDatasetConfigurationChange = vi.fn()
    render(
      <HydraulicProfileInputPanel
        mobileOpen={false}
        collapsed={false}
        conditionLabel="Existing Conditions"
        summaryText="summary"
        profileText="profile"
        dataset={dataset}
        summaryRows={summaryRows}
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

    await user.click(screen.getByRole('tab', { name: 'Review' }))
    expect(screen.getByLabelText('Ground used to assign station labels')).toHaveTextContent(
      'Dataset 2: 2-year · avg Z-min difference 0.00 ft',
    )

    await user.click(screen.getByRole('button', { name: 'Use Dataset 2 as ground' }))
    expect(onDatasetConfigurationChange).toHaveBeenLastCalledWith(expect.objectContaining({
      stationReferenceSlot: 1,
      definitions: expect.arrayContaining([
        expect.objectContaining({ slot: 1, kind: 'ground' }),
      ]),
    }))
  })
})
