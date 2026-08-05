import type { NewReportFigure } from '../../core/types'

type Metadata = Omit<
  NewReportFigure,
  'imageDataUrl' | 'widthPx' | 'heightPx'
>

export function createCanvasReportFigure(
  canvas: HTMLCanvasElement,
  metadata: Metadata,
): NewReportFigure {
  if (canvas.width <= 0 || canvas.height <= 0) {
    throw new Error('Generate the figure before adding it to the Export Collection.')
  }
  return {
    ...metadata,
    imageDataUrl: canvas.toDataURL('image/png'),
    widthPx: canvas.width,
    heightPx: canvas.height,
  }
}
