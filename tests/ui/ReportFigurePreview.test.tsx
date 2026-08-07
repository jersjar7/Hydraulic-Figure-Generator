import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReportFigureArtifact } from '../../src/core/types'
import { ReportFigurePreview } from '../../src/features/report-assembly/ReportFigurePreview'

function figure(editable = true): ReportFigureArtifact {
  return {
    id: 'figure-1',
    workspaceId: 'hydraulic-profiles-sections',
    workspaceLabel: 'Hydraulic Profiles & Sections',
    title: 'Station 10+47',
    caption: 'Existing-condition cross section.',
    imageDataUrl: 'data:image/png;base64,AA==',
    widthPx: 1200,
    heightPx: 900,
    createdAt: '2026-08-07T12:00:00.000Z',
    workspaceDraft: editable ? {
      workspaceId: 'hydraulic-profiles-sections',
      schemaVersion: 4,
      source: '{}',
    } : null,
  }
}

function renderPreview(
  item: ReportFigureArtifact,
  onOpenDraft = vi.fn(),
  openError = '',
) {
  render(
    <ReportFigurePreview
      figure={item}
      onChange={vi.fn()}
      onOpenDraft={onOpenDraft}
      opening={false}
      openError={openError}
      onRemove={vi.fn()}
      onClose={vi.fn()}
    />,
  )
  return onOpenDraft
}

describe('ReportFigurePreview', () => {
  it('launches an editable figure as a workspace starting point', () => {
    const onOpenDraft = renderPreview(figure())

    fireEvent.click(screen.getByRole('button', { name: 'Use as starting point' }))

    expect(onOpenDraft).toHaveBeenCalledTimes(1)
  })

  it('keeps legacy figures previewable but disables workspace launch', () => {
    renderPreview(figure(false))

    expect(screen.getByRole('button', { name: 'Use as starting point' }))
      .toBeDisabled()
    expect(screen.getByText(
      'Editable source is unavailable for this legacy figure.',
    )).toBeVisible()
    expect(screen.getByRole('button', { name: 'Use as starting point' }))
      .toHaveAccessibleDescription(
        'Editable source is unavailable for this legacy figure.',
      )
  })

  it('keeps launch validation errors inside the preview', () => {
    renderPreview(
      figure(),
      vi.fn(),
      'This figure uses an unsupported workspace draft version.',
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This figure uses an unsupported workspace draft version.',
    )
  })
})
