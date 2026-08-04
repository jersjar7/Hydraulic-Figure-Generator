import type { BinaryFilePort } from '../../application/ports/fileGateways'

export const browserBinaryFilePort: BinaryFilePort = {
  downloadBinary({ contents, fileName, mimeType }) {
    const blob = new Blob([contents], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
  },
}
