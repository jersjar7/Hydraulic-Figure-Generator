import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createDefaultFigureSettings } from '../../src/core/defaults'
import { AssessmentLinesToolPanel } from '../../src/features/assessment-lines/AssessmentLinesToolPanel'
import { createAssessmentWorkflowState } from '../../src/features/assessment-lines/useAssessmentWorkflow'

function workflow(collectionLines = 0) {
  const state = createAssessmentWorkflowState()
  state.collection = {
    interval: 1,
    minimumLevel: collectionLines ? 10 : null,
    maximumLevel: collectionLines ? 11 : null,
    levelCount: collectionLines,
    lines: Array.from({ length: collectionLines }, (_, index) => ({
      id: `line-${index}`,
      level: 10 + index,
      points: [],
    })),
  }
  return {
    state,
    setCollection: vi.fn(),
    invalidate: vi.fn(),
    clear: vi.fn(),
    openReview: vi.fn(),
    closeReview: vi.fn(),
    setReviewTab: vi.fn(),
    setCenterline: vi.fn(),
    setDirection: vi.fn(),
    setStartStation: vi.fn(),
    setOverride: vi.fn(),
    selectLine: vi.fn(),
    load: vi.fn(),
    reset: vi.fn(),
  }
}

function renderPanel(collectionLines = 0) {
  const assessmentWorkflow = workflow(collectionLines)
  const callbacks = {
    onGenerate: vi.fn(),
    onSettingsChange: vi.fn(),
  }
  render(
    <AssessmentLinesToolPanel
      busy={false}
      scenarios={[{ key: 'EX', label: 'Existing', kind: 'existing' }]}
      sourceId="EX"
      sourceRun={0}
      sourceRuns={[{
        key: 'EX',
        index: 0,
        condition: { key: 'EX', label: 'Existing', kind: 'existing' },
        run: { name: 'Existing 100YR', params: {} },
      }]}
      collection={assessmentWorkflow.state.collection}
      stationed={null}
      workflow={assessmentWorkflow}
      settings={createDefaultFigureSettings()}
      centerlineCandidates={[]}
      centerlineId=""
      centerlineDirection="a-to-b"
      startStation={0}
      onSourceChange={vi.fn()}
      onSourceRunChange={vi.fn()}
      onIntervalChange={vi.fn()}
      onClear={vi.fn()}
      onCenterlineChange={vi.fn()}
      onCenterlineDirectionChange={vi.fn()}
      onStartStationChange={vi.fn()}
      {...callbacks}
    />,
  )
  return callbacks
}

describe('WSE assessment lines tool', () => {
  it('keeps appearance and stationing progressive until lines exist', async () => {
    const user = userEvent.setup()
    const callbacks = renderPanel()

    expect(screen.getByText('Source')).toBeInTheDocument()
    expect(screen.queryByText('Appearance')).not.toBeInTheDocument()
    expect(screen.queryByText('Centerline stationing')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Generate WSE lines' }))
    expect(callbacks.onGenerate).toHaveBeenCalledOnce()
  })

  it('reveals appearance and stationing after explicit generation', async () => {
    const user = userEvent.setup()
    const callbacks = renderPanel(1)

    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Centerline stationing')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Show WSE lines' }))
    expect(callbacks.onSettingsChange).toHaveBeenCalledWith(
      'showAssessmentLines',
      false,
    )
  })
})
