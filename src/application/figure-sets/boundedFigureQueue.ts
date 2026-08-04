import type { FigureSetItemStatus } from '../../core/contracts/figureSet'

export type FigureQueueUpdate<Result> = {
  id: string
  status: FigureSetItemStatus
  result?: Result
  error?: string
}

export type FigureQueueSummary<Result> = {
  completed: Map<string, Result>
  failed: Map<string, string>
  cancelled: boolean
}

type QueueOptions<Item, Result> = {
  concurrency?: number
  signal?: AbortSignal
  itemId(item: Item): string
  worker(item: Item, signal?: AbortSignal): Promise<Result>
  onUpdate?(update: FigureQueueUpdate<Result>): void
}

export async function runBoundedFigureQueue<Item, Result>(
  items: readonly Item[],
  options: QueueOptions<Item, Result>,
): Promise<FigureQueueSummary<Result>> {
  const concurrency = Math.max(
    1,
    Math.min(items.length || 1, Math.floor(options.concurrency ?? 2)),
  )
  const completed = new Map<string, Result>()
  const failed = new Map<string, string>()
  let nextIndex = 0

  for (const item of items) {
    options.onUpdate?.({
      id: options.itemId(item),
      status: 'queued',
    })
  }

  const runWorker = async () => {
    while (!options.signal?.aborted) {
      const index = nextIndex
      nextIndex += 1
      if (index >= items.length) return
      const item = items[index]
      const id = options.itemId(item)
      options.onUpdate?.({ id, status: 'generating' })
      try {
        const result = await options.worker(item, options.signal)
        if (options.signal?.aborted) return
        completed.set(id, result)
        options.onUpdate?.({ id, status: 'ready', result })
      } catch (error) {
        if (options.signal?.aborted) return
        const message = error instanceof Error ? error.message : String(error)
        failed.set(id, message)
        options.onUpdate?.({ id, status: 'error', error: message })
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, runWorker))
  return {
    completed,
    failed,
    cancelled: Boolean(options.signal?.aborted),
  }
}
