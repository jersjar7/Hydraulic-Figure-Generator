import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createDefaultFigureSettings } from '../../src/core/defaults'
import { CenterlineStationingToolPanel } from '../../src/features/stationing/CenterlineStationingToolPanel'

describe('CenterlineStationingToolPanel', () => {
  it('combines line selection with the complete stationing workflow', () => {
    const onCenterlineChange = vi.fn()
    const onChange = vi.fn()
    render(
      <CenterlineStationingToolPanel
        candidates={[{
          id: 'centerline',
          overlayId: 'overlay',
          overlayName: 'Hydraulic Centerline',
          featureIndex: 0,
          partIndex: 0,
          mapPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
          modelPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
          lengthFeet: 100,
        }]}
        centerlineId=""
        direction="a-to-b"
        startStation={0}
        settings={createDefaultFigureSettings().centerlineStationing}
        ticks={[]}
        selectedLabelId={null}
        hasCenterline={false}
        onCenterlineChange={onCenterlineChange}
        onDirectionChange={vi.fn()}
        onStartStationChange={vi.fn()}
        onChange={onChange}
        onSelectLabel={vi.fn()}
        onOverrideChange={vi.fn()}
        onNudgeSelected={vi.fn()}
        onReset={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Centerline feature'), {
      target: { value: 'centerline' },
    })
    fireEvent.click(screen.getByText('25 / 100'))

    expect(onCenterlineChange).toHaveBeenCalledWith('centerline')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      minorInterval: 25,
      majorInterval: 100,
    }))
    expect(screen.getByText('Ticks')).toBeInTheDocument()
    expect(screen.getByText('Station labels')).toBeInTheDocument()
  })
})
