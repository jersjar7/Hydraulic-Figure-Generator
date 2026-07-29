import type {
  ProjectFilePort,
  TextDownload,
} from '../../application/ports/fileGateways'

function downloadText({
  contents,
  fileName,
  mimeType,
}: TextDownload) {
  const blob = new Blob([contents], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export const browserProjectFilePort: ProjectFilePort = {
  readText: (file) => file.text(),
  downloadText,
}
