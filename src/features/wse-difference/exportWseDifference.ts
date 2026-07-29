import {
  wseDifferenceFigure,
  type WseDifferenceRenderRequest,
} from './wseDifferenceFigure'

type ExportRenderRequest = Omit<WseDifferenceRenderRequest, 'canvas'>

function canvasPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The browser could not encode the map as PNG.'))
    }, 'image/png')
  })
}

export async function renderWseDifferenceExport(
  request: ExportRenderRequest,
) {
  const canvas = document.createElement('canvas')
  await wseDifferenceFigure.render({ ...request, canvas })
  return canvas
}

export async function downloadWseDifferencePng(
  request: ExportRenderRequest,
) {
  const canvas = await renderWseDifferenceExport(request)
  const blob = await canvasPngBlob(canvas)
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = wseDifferenceFigure.exportFileName(request.scene)
    anchor.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}
