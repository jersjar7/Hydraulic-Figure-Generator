import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { flattenReportFigures } from '../../src/application/report-assembly/reportAssembly'
import type { NewReportFigure } from '../../src/core/types'
import { ReportFigureExportActions } from '../../src/features/project-workspace/ReportFigureExportActions'
import { HydraulicProjectWorkspaceProvider } from '../../src/features/project-workspace/HydraulicProjectWorkspaceProvider'
import { useHydraulicProjectWorkspace } from '../../src/features/project-workspace/useHydraulicProjectWorkspace'

const WORKSPACE_ID = 'hydraulic-profiles-sections'

function figure(version: number): NewReportFigure {
  return {
    workspaceId: WORKSPACE_ID,
    workspaceLabel: 'Hydraulic Profiles & Sections',
    title: `Profile version ${version}`,
    caption: `Profile caption ${version}`,
    imageDataUrl: `data:image/png;base64,${version === 1 ? 'AA==' : 'AQ=='}`,
    widthPx: 1200,
    heightPx: 900,
    workspaceDraft: {
      workspaceId: WORKSPACE_ID,
      schemaVersion: 4,
      source: JSON.stringify({ version }),
    },
  }
}

function Harness() {
  const { reportAssembly } = useHydraulicProjectWorkspace()
  const [version, setVersion] = useState(1)
  const figures = flattenReportFigures(reportAssembly.document)
  return (
    <>
      <button type="button" onClick={() => setVersion(2)}>Change figure</button>
      <ReportFigureExportActions
        workspaceId={WORKSPACE_ID}
        canExport
        createFigure={() => figure(version)}
      />
      <output aria-label="Figure count">{figures.length}</output>
      <output aria-label="Figure titles">
        {figures.map((item) => item.title).join('|')}
      </output>
    </>
  )
}

describe('ReportFigureExportActions', () => {
  it('updates a linked artifact or saves an independent copy explicitly', async () => {
    render(
      <HydraulicProjectWorkspaceProvider>
        <Harness />
      </HydraulicProjectWorkspaceProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add to export' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Update exported figure' }))
        .toBeVisible()
    })
    expect(screen.getByLabelText('Figure count')).toHaveTextContent('1')
    expect(screen.getByLabelText('Figure titles')).toHaveTextContent('Profile version 1')

    fireEvent.click(screen.getByRole('button', { name: 'Change figure' }))
    fireEvent.click(screen.getByRole('button', { name: 'Update exported figure' }))
    expect(screen.getByLabelText('Figure count')).toHaveTextContent('1')
    expect(screen.getByLabelText('Figure titles')).toHaveTextContent('Profile version 2')

    fireEvent.click(screen.getByRole('button', { name: 'Save as new figure' }))
    expect(screen.getByLabelText('Figure count')).toHaveTextContent('2')
    expect(screen.getByLabelText('Figure titles')).toHaveTextContent(
      'Profile version 2|Profile version 2',
    )

    fireEvent.click(screen.getByRole('button', {
      name: 'Stop editing this exported figure',
    }))
    expect(screen.getByRole('button', { name: 'Add to export' })).toBeVisible()
  })
})
