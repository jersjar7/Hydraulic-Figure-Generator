import type { OverlayArchivePort } from '../../application/ports/fileGateways'
import { readShapefileOverlays } from '../../core/shapefile'

export const shapefileArchivePort: OverlayArchivePort = {
  read: readShapefileOverlays,
}
