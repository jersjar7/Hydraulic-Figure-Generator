import type { HydraulicFileIngestionPort } from './ports/fileGateways'

export function importHydraulicFiles(
  files: File[],
  gateway: HydraulicFileIngestionPort,
) {
  return gateway.ingest(files.filter((file) => /\.h5$/i.test(file.name)))
}
