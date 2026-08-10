import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AnnotationSettingsPanel } from '../../src/features/wse-difference/components/AnnotationSettingsPanel'
import type {
  AnnotationPanelActions,
  AnnotationPanelModel,
} from '../../src/features/wse-difference/annotationPanelTypes'

const annotation = {
  id: 'annotation-1',
  kind: 'text' as const,
  points: [{ x: 1, y: 2 }],
  text: 'Bridge opening',
  color: '#111111',
  fillColor: '#ffffff',
  lineWidth: 2,
  fontSize: 18,
  rotation: 0,
  dashed: false,
  background: true,
}

const callout = {
  ...annotation,
  id: 'callout-1',
  kind: 'leader' as const,
  points: [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ],
  defaultPoints: [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ],
  leaderVisible: true,
  locked: false,
}

function createActions(): AnnotationPanelActions {
  return {
    choosePanelView: vi.fn(),
    handlePanelTabKeyDown: vi.fn(),
    chooseTool: vi.fn(),
    cancelDrawing: vi.fn(),
    addExtremaCallouts: vi.fn(),
    updateAppearance: vi.fn(),
    setResultField: vi.fn(),
    selectPlaced: vi.fn(),
    handleListKeyDown: vi.fn(),
    clearAnnotations: vi.fn(),
    returnToList: vi.fn(),
    selectAdjacent: vi.fn(),
    setEditorView: vi.fn(),
    handleEditorTabKeyDown: vi.fn(),
    nudgeSelected: vi.fn(),
    setSelectedLocked: vi.fn(),
    setSelectedLeaderVisible: vi.fn(),
    resetSelectedPosition: vi.fn(),
    duplicateSelected: vi.fn(),
    deleteSelected: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
  }
}

function createModel(
  patch: Partial<AnnotationPanelModel> = {},
): AnnotationPanelModel {
  return {
    annotations: [],
    panelView: 'create',
    placedView: 'list',
    editorView: 'content',
    tool: 'select',
    drawing: false,
    sceneReady: true,
    extrema: null,
    extremaCalloutCount: 0,
    baselineLabel: 'Existing',
    comparisonLabel: 'Proposed',
    editor: {
      text: 'Note',
      color: '#111111',
      fillColor: '#ffffff',
      lineWidth: 2,
      fontSize: 18,
      rotation: 0,
      dashed: false,
      background: true,
    },
    activeResultField: 'summary',
    resultLabelOptions: [{ value: 'summary', label: 'WSE summary' }],
    selectedId: null,
    selected: null,
    selectedIndex: -1,
    listItemRefs: { current: new Map() },
    canUndo: false,
    canRedo: false,
    undoLabel: null,
    redoLabel: null,
    ...patch,
  }
}

describe('AnnotationSettingsPanel', () => {
  it('routes annotation workspace tab selection through its actions', async () => {
    const user = userEvent.setup()
    const actions = createActions()
    render(
      <AnnotationSettingsPanel
        model={createModel()}
        actions={actions}
      />,
    )

    await user.click(screen.getByRole('tab', { name: /placed/i }))

    expect(actions.choosePanelView).toHaveBeenCalledWith('placed')
  })

  it('selects a placed annotation from the manager list', async () => {
    const user = userEvent.setup()
    const actions = createActions()
    render(
      <AnnotationSettingsPanel
        model={createModel({
          annotations: [annotation],
          panelView: 'placed',
        })}
        actions={actions}
      />,
    )

    await user.click(screen.getByRole('option'))

    expect(actions.selectPlaced).toHaveBeenCalledWith(annotation)
  })

  it('edits anchored callout leader visibility from the style view', async () => {
    const user = userEvent.setup()
    const actions = createActions()
    render(
      <AnnotationSettingsPanel
        model={createModel({
          annotations: [callout],
          panelView: 'placed',
          placedView: 'detail',
          editorView: 'style',
          selectedId: callout.id,
          selected: callout,
          selectedIndex: 0,
          editor: callout,
        })}
        actions={actions}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Leader line' }))

    expect(actions.setSelectedLeaderVisible).toHaveBeenCalledWith(false)
  })

  it('locks, nudges, and resets callout position from one compact view', async () => {
    const user = userEvent.setup()
    const actions = createActions()
    render(
      <AnnotationSettingsPanel
        model={createModel({
          annotations: [callout],
          panelView: 'placed',
          placedView: 'detail',
          editorView: 'position',
          selectedId: callout.id,
          selected: callout,
          selectedIndex: 0,
          editor: callout,
        })}
        actions={actions}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Lock position' }))
    await user.click(screen.getByRole('button', { name: 'Move annotation right' }))
    await user.click(screen.getByRole('button', { name: 'Reset position' }))

    expect(actions.setSelectedLocked).toHaveBeenCalledWith(true)
    expect(actions.nudgeSelected).toHaveBeenCalledWith(10, 0)
    expect(actions.resetSelectedPosition).toHaveBeenCalledOnce()
  })
})
