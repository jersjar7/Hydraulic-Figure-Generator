import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type {
  MapInteractionTool,
  MapPointerInput,
} from '../src/features/map-interactions/mapInteraction'
import { MapInteractionRuntime } from '../src/features/map-interactions/mapInteractionRuntime'

const input: MapPointerInput = {
  screenPoint: { x: 10, y: 20 },
  mapPoint: { x: 100, y: 200 },
}

describe('map interaction runtime', () => {
  it('owns one active tool session through finish', () => {
    const events: string[] = []
    const tool: MapInteractionTool = {
      id: 'drag',
      begin: () => ({
        handled: true,
        capturePointer: true,
        session: {
          id: 'drag:1',
          move: () => events.push('move'),
          finish: () => events.push('finish'),
        },
      }),
    }
    const runtime = new MapInteractionRuntime(() => [tool])

    const begun = runtime.begin(input)
    runtime.move(input)
    const finished = runtime.finish(input)

    assert.equal(begun?.capturePointer, true)
    assert.deepEqual(events, ['move', 'finish'])
    assert.equal(finished, true)
    assert.deepEqual(runtime.state(), { phase: 'idle' })
  })

  it('cancels an active session before beginning another', () => {
    const events: string[] = []
    const runtime = new MapInteractionRuntime(() => [
      {
        id: 'drag',
        begin: () => ({
          handled: true,
          session: {
            id: 'drag:1',
            cancel: () => events.push('cancel'),
          },
        }),
      },
    ])

    runtime.begin(input)
    runtime.begin(input)

    assert.deepEqual(events, ['cancel'])
    assert.deepEqual(runtime.state(), {
      phase: 'active',
      toolId: 'drag',
      sessionId: 'drag:1',
    })
  })

  it('dispatches hover only while idle', () => {
    let hoverCount = 0
    const runtime = new MapInteractionRuntime(() => [
      {
        id: 'hover',
        begin: () => null,
        hover: () => {
          hoverCount += 1
        },
      },
    ])

    runtime.move(input)

    assert.equal(hoverCount, 1)
  })
})
