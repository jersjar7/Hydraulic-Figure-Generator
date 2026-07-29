import type { OverlayArchivePort } from './ports/fileGateways'

export function importOverlayArchives(
  files: File[],
  startingIndex: number,
  gateway: OverlayArchivePort,
) {
  return gateway.read(
    files.filter((file) => /\.zip$/i.test(file.name)),
    startingIndex,
  )
}
