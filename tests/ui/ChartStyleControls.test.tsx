import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import {
  createDefaultChartAxesSettings,
  createDefaultChartLegendSettings,
} from '../../src/core/chartStyle'
import type {
  ChartLayoutSettings,
  ChartLineStyle,
  ChartSeriesControl,
} from '../../src/core/contracts/chartStyle'
import { ChartAxesControls } from '../../src/features/chart-tools/ChartAxesControls'
import { ChartLayoutControls } from '../../src/features/chart-tools/ChartLayoutControls'
import { ChartSeriesControls } from '../../src/features/chart-tools/ChartSeriesControls'

function LayoutHarness() {
  const [layout, setLayout] = useState<ChartLayoutSettings>({
    title: 'Hydraulic Cross Section',
    orientation: 'landscape',
  })
  const [legend, setLegend] = useState(createDefaultChartLegendSettings)
  return <ChartLayoutControls layout={layout} legend={legend} onLayoutChange={setLayout} onLegendChange={setLegend} />
}

function AxesHarness() {
  const [axes, setAxes] = useState(createDefaultChartAxesSettings)
  return <ChartAxesControls axes={axes} onChange={setAxes} />
}

function SeriesHarness() {
  const [series, setSeries] = useState<ChartSeriesControl[]>([
    { id: 'ground', label: 'Ground', visible: true, style: { color: '#765432', width: 3, dash: [] } },
    { id: 'wse', label: '100-year', visible: true, style: { color: '#1769aa', width: 2, dash: [] } },
  ])
  const update = (id: string, change: Partial<ChartSeriesControl>) => setSeries((current) => current.map((item) => item.id === id ? { ...item, ...change } : item))
  const move = (id: string, direction: -1 | 1) => setSeries((current) => {
    const next = [...current]
    const index = next.findIndex((item) => item.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= next.length) return current
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })
  return <ChartSeriesControls
    series={series}
    onLabelChange={(id, label) => update(id, { label })}
    onStyleChange={(id, style: ChartLineStyle) => update(id, { style })}
    onVisibilityChange={(id, visible) => update(id, { visible })}
    onMove={move}
  />
}

describe('shared chart style controls', () => {
  it('edits layout and reveals consistent legend controls', async () => {
    const user = userEvent.setup()
    render(<LayoutHarness />)

    await user.click(screen.getByRole('button', { name: 'Portrait' }))
    expect(screen.getByRole('button', { name: 'Portrait' })).toHaveClass('active')
    await user.selectOptions(screen.getByLabelText('Legend position'), 'bottom-left')
    expect(screen.getByLabelText('Legend position')).toHaveValue('bottom-left')
  })

  it('edits shared axes and validates explicit auto bounds in the UI', async () => {
    const user = userEvent.setup()
    render(<AxesHarness />)

    await user.clear(screen.getByLabelText('Y minimum'))
    await user.type(screen.getByLabelText('Y minimum'), '20.5')
    expect(screen.getByLabelText('Y minimum')).toHaveValue(20.5)
    await user.clear(screen.getByLabelText('X-axis label'))
    await user.type(screen.getByLabelText('X-axis label'), 'Offset (ft)')
    expect(screen.getByLabelText('X-axis label')).toHaveValue('Offset (ft)')
  })

  it('renames, hides, restyles, and reorders series from one control', async () => {
    const user = userEvent.setup()
    render(<SeriesHarness />)

    const nameInput = screen.getByLabelText('Series 2 legend name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Design WSE')
    await user.selectOptions(screen.getByLabelText('Design WSE pattern'), 'dashed')
    await user.click(screen.getByRole('button', { name: 'Hide Design WSE' }))
    await user.click(screen.getByRole('button', { name: 'Move Design WSE up' }))

    expect(screen.getByLabelText('Design WSE pattern')).toHaveValue('dashed')
    const names = screen.getAllByRole('textbox').map((input) => (input as HTMLInputElement).value)
    expect(names[0]).toBe('Design WSE')
    expect(screen.getByRole('button', { name: 'Show Design WSE' })).toBeInTheDocument()
  })
})
