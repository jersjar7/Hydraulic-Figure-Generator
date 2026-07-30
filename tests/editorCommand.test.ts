import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createEditorHistory,
  executeEditorCommand,
  redoEditorCommand,
  undoEditorCommand,
} from '../src/features/editor-history/editorCommand'

test('editor commands execute, undo, and redo immutable values', () => {
  const initial = createEditorHistory<number[]>()
  const executed = executeEditorCommand(initial, [1], {
    label: 'append value',
    apply: (current) => [...current, 2],
  })
  assert.deepEqual(executed.value, [1, 2])
  assert.equal(executed.history.past.length, 1)

  const undone = undoEditorCommand(executed.history)
  assert.deepEqual(undone.value, [1])
  assert.equal(undone.history.future.length, 1)

  const redone = redoEditorCommand(undone.history)
  assert.deepEqual(redone.value, [1, 2])
  assert.equal(redone.history.future.length, 0)
})

test('matching merge keys collapse continuous edits into one undo step', () => {
  const initial = createEditorHistory<{ text: string }>()
  const first = executeEditorCommand(initial, { text: '' }, {
    label: 'edit text',
    mergeKey: 'annotation:1:text',
    apply: () => ({ text: 'A' }),
  })
  const second = executeEditorCommand(first.history, first.value, {
    label: 'edit text',
    mergeKey: 'annotation:1:text',
    apply: () => ({ text: 'AB' }),
  })

  assert.equal(second.history.past.length, 1)
  assert.deepEqual(undoEditorCommand(second.history).value, { text: '' })
})

test('executing after undo clears the redo branch', () => {
  const initial = createEditorHistory<number>()
  const first = executeEditorCommand(initial, 1, {
    label: 'increment',
    apply: (value) => value + 1,
  })
  const undone = undoEditorCommand(first.history)
  const replacement = executeEditorCommand(undone.history, undone.value!, {
    label: 'double',
    apply: (value) => value * 2,
  })

  assert.equal(replacement.history.future.length, 0)
  assert.equal(replacement.value, 2)
})
