import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createWseEditorUiState,
  wseEditorUiReducer,
} from '../src/features/wse-difference/wseEditorUi'

describe('WSE editor UI state', () => {
  it('updates one transient editor field without affecting the document', () => {
    const initial = createWseEditorUiState()
    const selected = wseEditorUiReducer(initial, {
      type: 'field/set',
      field: 'selectedAnnotationId',
      value: 'note-1',
    })

    assert.equal(initial.selectedAnnotationId, null)
    assert.equal(selected.selectedAnnotationId, 'note-1')
    assert.equal(selected.annotationTool, initial.annotationTool)
  })

  it('resets panels, selections, and interaction flags together', () => {
    const initial = {
      ...createWseEditorUiState(),
      annotationTool: 'leader' as const,
      selectedAnnotationId: 'leader-1',
      annotationDragging: true,
      leftOpen: true,
      rightOpen: true,
    }
    const reset = wseEditorUiReducer(initial, { type: 'editor/reset' })

    assert.equal(reset.annotationTool, 'select')
    assert.equal(reset.selectedAnnotationId, null)
    assert.equal(reset.annotationDragging, false)
    assert.equal(reset.leftOpen, false)
    assert.equal(reset.rightOpen, false)
  })
})
