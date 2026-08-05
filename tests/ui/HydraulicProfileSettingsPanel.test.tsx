import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { HydraulicProfileLine, HydraulicProfileSection } from '../../src/core/types'
import { HydraulicProfileSettingsPanel } from '../../src/features/hydraulic-profiles/HydraulicProfileSettingsPanel'
import {
  createDefaultHydraulicProfileSettings,
  type HydraulicProfileFigureSettings,
} from '../../src/features/hydraulic-profiles/hydraulicProfileSettings'

function line(
  datasetSlot: number,
  name: string,
  kind: HydraulicProfileLine['kind'],
): HydraulicProfileLine {
  return {
    id: `line-${datasetSlot}`,
    sourceIndex: datasetSlot,
    datasetSlot,
    name,
    kind,
    distances: [0, 10],
    elevations: [20 + datasetSlot, 20 + datasetSlot],
  }
}

const existingGround = line(0, 'Existing Ground', 'ground')
const proposedGround = line(1, 'Proposed Ground', 'ground')
const wse = line(2, '100-year', 'wse')
const profileSection: HydraulicProfileSection = {
  id: 'section-1',
  sourceIndex: 0,
  station: 100,
  stationLabel: '1+00',
  summaryZMinimum: 20,
  thalweg: 20,
  sourceSeries: [existingGround, proposedGround, wse],
  lines: [existingGround, proposedGround, wse],
  grounds: [existingGround, proposedGround],
  surfaces: [wse],
  otherLines: [],
  primaryGround: existingGround,
  stationReferenceLine: existingGround,
}

function Panel() {
  const [settings, setSettings] = useState<HydraulicProfileFigureSettings>(
    createDefaultHydraulicProfileSettings,
  )
  return <HydraulicProfileSettingsPanel
    section="layout"
    settings={settings}
    profileSection={profileSection}
    canDownload={false}
    datasetConfiguration={null}
    onSettingsChange={setSettings}
    onDatasetConfigurationChange={vi.fn()}
    onAddToExport={vi.fn()}
    onDownload={vi.fn()}
  />
}

describe('HydraulicProfileSettingsPanel', () => {
  it('defaults to clipping WSEs and exposes raw SMS extents as a reversible mode', async () => {
    const user = userEvent.setup()
    render(<Panel />)

    expect(screen.getByLabelText('WSE extent')).toHaveValue('clip')
    expect(screen.getByLabelText('WSE clipping ground')).toHaveValue('0')

    await user.selectOptions(screen.getByLabelText('WSE clipping ground'), '1')
    expect(screen.getByLabelText('WSE clipping ground')).toHaveValue('1')

    await user.selectOptions(screen.getByLabelText('WSE extent'), 'raw')
    expect(screen.getByLabelText('WSE extent')).toHaveValue('raw')
    expect(screen.queryByLabelText('WSE clipping ground')).not.toBeInTheDocument()
  })
})
