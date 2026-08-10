import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type {
  HydraulicLongitudinalScene,
  HydraulicProfileLine,
  HydraulicProfileSection,
} from '../../src/core/types'
import { HydraulicProfileStructuresPanel } from '../../src/features/hydraulic-profiles/HydraulicProfileStructuresPanel'

const ground: HydraulicProfileLine = {
  id: 'ground',
  sourceIndex: 0,
  datasetSlot: 0,
  name: 'Proposed Ground',
  kind: 'ground',
  distances: [0, 10, 20],
  elevations: [30, 25, 31],
}

const section: HydraulicProfileSection = {
  id: 'section-1',
  sourceIndex: 0,
  station: 100,
  stationLabel: '1+00',
  summaryZMinimum: 25,
  thalweg: 25,
  sourceSeries: [ground],
  lines: [ground],
  grounds: [ground],
  surfaces: [],
  otherLines: [],
  primaryGround: ground,
  stationReferenceLine: ground,
}

const longitudinalScene: HydraulicLongitudinalScene = {
  conditionLabel: 'Proposed Conditions',
  lines: [ground],
  grounds: [ground],
  surfaces: [],
  markers: [],
  culverts: [],
  warnings: [],
}

describe('HydraulicProfileStructuresPanel', () => {
  it('adds a shape-specific culvert to the selected cross section', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <HydraulicProfileStructuresPanel
        view="cross-sections"
        section={section}
        longitudinalScene={null}
        crossSectionCulvert={null}
        longitudinalCulverts={[]}
        onCrossSectionCulvertChange={onChange}
        onLongitudinalCulvertsChange={vi.fn()}
      />,
    )

    await user.selectOptions(
      screen.getByLabelText('Culvert at selected station'),
      'arch',
    )

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      sectionId: 'section-1',
      kind: 'arch',
      scour: 0,
      bed: 2,
    }))
  })

  it('adds a longitudinal box within the profile data bounds', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <HydraulicProfileStructuresPanel
        view="longitudinal"
        section={null}
        longitudinalScene={longitudinalScene}
        crossSectionCulvert={null}
        longitudinalCulverts={[]}
        onCrossSectionCulvertChange={vi.fn()}
        onLongitudinalCulvertsChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add box culvert' }))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Box Culvert 1',
        leftStation: expect.any(Number),
        rightStation: expect.any(Number),
      }),
    ])
  })
})
