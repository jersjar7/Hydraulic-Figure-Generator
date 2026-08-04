import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { runBoundedFigureQueue } from '../src/application/figure-sets/boundedFigureQueue'

describe('bounded figure generation queue', () => {
  it('limits concurrent work and reports item progress', async () => {
    let active = 0
    let maximumActive = 0
    const statuses = new Map<string, string[]>()

    const summary = await runBoundedFigureQueue([1, 2, 3, 4], {
      concurrency: 2,
      itemId: (item) => String(item),
      worker: async (item) => {
        active += 1
        maximumActive = Math.max(maximumActive, active)
        await new Promise((resolve) => setTimeout(resolve, 5))
        active -= 1
        return item * 10
      },
      onUpdate: ({ id, status }) => {
        statuses.set(id, [...(statuses.get(id) ?? []), status])
      },
    })

    assert.equal(maximumActive, 2)
    assert.deepEqual([...summary.completed.values()], [10, 20, 30, 40])
    assert.equal(summary.failed.size, 0)
    assert.deepEqual(statuses.get('1'), ['queued', 'generating', 'ready'])
  })

  it('isolates failed figures and honors cancellation', async () => {
    const failed = await runBoundedFigureQueue([1, 2], {
      concurrency: 1,
      itemId: String,
      worker: async (item) => {
        if (item === 1) throw new Error('broken figure')
        return item
      },
    })
    assert.equal(failed.failed.get('1'), 'broken figure')
    assert.equal(failed.completed.get('2'), 2)

    const controller = new AbortController()
    const cancelled = await runBoundedFigureQueue([1, 2, 3], {
      concurrency: 1,
      signal: controller.signal,
      itemId: String,
      worker: async (item) => {
        controller.abort()
        return item
      },
    })
    assert.equal(cancelled.cancelled, true)
    assert.equal(cancelled.completed.size, 0)
  })
})
