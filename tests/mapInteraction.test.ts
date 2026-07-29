import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  beginMapInteraction,
  updateMapToolHover,
  type MapInteractionTool,
  type MapPointerInput,
} from '../src/features/map-interactions/mapInteraction'

const input: MapPointerInput = {
  screenPoint: { x: 20, y: 40 },
  mapPoint: { x: 120, y: 240 },
}

describe('map interaction tools', () => {
  it('uses the first tool that handles a pointer interaction', () => {
    const visited: string[] = []
    const tools: MapInteractionTool[] = [
      {
        id: 'element',
        begin: () => {
          visited.push('element')
          return null
        },
      },
      {
        id: 'station-label',
        begin: () => {
          visited.push('station-label')
          return {
            handled: true,
            capturePointer: true,
            session: { id: 'station-1' },
          }
        },
      },
      {
        id: 'annotation',
        begin: () => {
          visited.push('annotation')
          return { handled: true }
        },
      },
    ]

    const result = beginMapInteraction(tools, input)

    assert.deepEqual(visited, ['element', 'station-label'])
    assert.equal(result?.toolId, 'station-label')
    assert.equal(result?.capturePointer, true)
    assert.equal(result?.session?.id, 'station-1')
  })

  it('keeps hover behavior independent from pointer ownership', () => {
    const hovered: string[] = []
    const tools: MapInteractionTool[] = [
      {
        id: 'element',
        begin: () => null,
        hover: () => hovered.push('element'),
      },
      {
        id: 'annotation',
        begin: () => null,
        hover: () => hovered.push('annotation'),
      },
    ]

    updateMapToolHover(tools, input)

    assert.deepEqual(hovered, ['element', 'annotation'])
  })
})
