import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDefaultFigureSettings } from '../src/core/defaults'
import {
  figureElementState,
  patchMapElementPosition,
  resetMapElement,
  withFigureElementState,
  withMapElementVisibility,
} from '../src/features/figure-elements/figureElementOperations'

describe('shared figure-element operations', () => {
  it('updates one element without mutating its workspace settings', () => {
    const settings = createDefaultFigureSettings()
    const moved = patchMapElementPosition(
      figureElementState(settings),
      'title',
      { offX: 125, locked: true },
    )

    assert.notEqual(moved, settings)
    assert.equal(moved.elementPositions.title.offX, 125)
    assert.equal(moved.elementPositions.title.locked, true)
    assert.equal(settings.elementPositions.title.locked, undefined)
    assert.deepEqual(moved.elementPositions.scale, settings.elementPositions.scale)
  })

  it('merges undo state without reverting unrelated workspace changes', () => {
    const settings = createDefaultFigureSettings()
    const before = figureElementState(settings)
    const after = withMapElementVisibility(before, 'diffLegend', false)
    const changedWorkspace = { ...settings, zoom: 2.25, contourWidth: 4 }
    const restored = withFigureElementState(changedWorkspace, after)

    assert.equal(restored.showLegend, false)
    assert.equal(restored.zoom, 2.25)
    assert.equal(restored.contourWidth, 4)
  })

  it('resets visibility, position lock, and style for only one element', () => {
    const settings = createDefaultFigureSettings()
    const modified = patchMapElementPosition(
      withMapElementVisibility(figureElementState(settings), 'north', false),
      'north',
      { offX: 300, locked: true },
    )
    const reset = resetMapElement(modified, 'north')

    assert.equal(reset.showNorth, true)
    assert.equal(reset.elementPositions.north.offX, 0)
    assert.equal(reset.elementPositions.north.locked, false)
    assert.deepEqual(reset.elementPositions.title, settings.elementPositions.title)
  })
})
