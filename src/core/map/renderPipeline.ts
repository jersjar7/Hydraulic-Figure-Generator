export type FigureRenderLayer<Context> = {
  id: string
  render(context: Context): void | Promise<void>
}

export async function executeRenderLayers<Context>(
  layers: readonly FigureRenderLayer<Context>[],
  context: Context,
  signal?: AbortSignal,
) {
  for (const layer of layers) {
    if (signal?.aborted) {
      throw new DOMException('Rendering was cancelled.', 'AbortError')
    }
    await layer.render(context)
  }
}
