import { fireEvent, render, screen, within } from '@testing-library/react'
import { SlidersHorizontal, Palette } from 'lucide-react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { FigureWorkspaceScaffold } from '../../src/components/editor/FigureWorkspaceScaffold'

const sections = [
  {
    key: 'calculation',
    label: 'Calculation',
    title: 'Map calculation',
    icon: SlidersHorizontal,
  },
  {
    key: 'legend',
    label: 'Legend',
    title: 'Legend and colors',
    icon: Palette,
  },
] as const

function Harness() {
  const [active, setActive] =
    useState<(typeof sections)[number]['key']>('calculation')

  return (
    <FigureWorkspaceScaffold
      figureLabel="Test figure"
      comparisonDescription="Comparison minus Baseline"
      inputsCollapsed={false}
      leftPanelOpen={false}
      rightPanelOpen={false}
      busy={false}
      notices={[]}
      settingsSections={sections}
      activeSettingsSection={active}
      projectPanel={<aside>Project panel</aside>}
      mapContent={<canvas aria-label="Test map" />}
      settingsContent={<div>{active} controls</div>}
      figurePicker={
        <select aria-label="Workspace" defaultValue="test">
          <option value="test">Test figure</option>
        </select>
      }
      onSave={() => undefined}
      onLoad={() => undefined}
      onOpenLeftPanel={() => undefined}
      onOpenRightPanel={() => undefined}
      onCloseMobilePanels={() => undefined}
      onCloseSettingsPanel={() => undefined}
      onSettingsSectionChange={setActive}
      onZoomOut={() => undefined}
      onZoomIn={() => undefined}
      onFitFrame={() => undefined}
    />
  )
}

describe('FigureWorkspaceScaffold', () => {
  it('composes project, canvas, and settings regions', () => {
    render(<Harness />)

    expect(screen.getByText('Project panel')).toBeInTheDocument()
    expect(screen.getByLabelText('Test map')).toBeInTheDocument()
    expect(screen.getByText('calculation controls')).toBeInTheDocument()
    const brand = screen
      .getByRole('heading', { name: 'Hydraulic Figure Generator' })
      .closest('.brand')
    expect(brand).not.toBeNull()
    expect(within(brand!).getByLabelText('Workspace')).toBeInTheDocument()
  })

  it('provides reusable keyboard navigation for settings sections', () => {
    render(<Harness />)

    const calculation = screen.getByRole('tab', {
      name: 'Calculation',
    })
    calculation.focus()
    fireEvent.keyDown(calculation, { key: 'ArrowRight' })

    expect(screen.getByRole('tab', { name: 'Legend' })).toHaveFocus()
    expect(screen.getByText('legend controls')).toBeInTheDocument()
  })
})
