import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  executeRenderLayers,
  type FigureRenderLayer,
} from '../src/core/map/renderPipeline'
import {
  WSE_DIFFERENCE_RENDER_LAYERS,
} from '../src/core/map/wseDifferenceRenderLayers'

describe('figure render pipeline', () => {
  it('executes asynchronous layers in declared order', async () => {
    const rendered: string[] = []
    const layers: FigureRenderLayer<string[]>[] = [
      {
        id: 'first',
        async render(context) {
          await Promise.resolve()
          context.push('first')
        },
      },
      {
        id: 'second',
        render(context) {
          context.push('second')
        },
      },
    ]

    await executeRenderLayers(layers, rendered)
    assert.deepEqual(rendered, ['first', 'second'])
  })

  it('keeps the accepted WSE map composition explicit', () => {
    assert.deepEqual(
      WSE_DIFFERENCE_RENDER_LAYERS.map((layer) => layer.id),
      [
        'basemap',
        'difference-bands',
        'wet-dry',
        'difference-outlines',
        'assessment-lines',
        'overlays',
        'stationing',
        'assessment-callouts',
        'annotations',
        'figure-elements',
      ],
    )
  })

  it('stops before the first layer when rendering is cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(
      executeRenderLayers(
        [{ id: 'never', render: () => assert.fail('rendered') }],
        {},
        controller.signal,
      ),
      (error: unknown) =>
        error instanceof DOMException && error.name === 'AbortError',
    )
  })
})
