import shp from 'shpjs'
import type {
  GeoJsonFeatureCollection,
  IngestNotice,
  MapOverlay,
} from './types'

const COLORS = [
  '#111827',
  '#d92727',
  '#f0aa00',
  '#008fba',
  '#684aa8',
  '#df681e',
]

function asCollections(
  value: unknown,
  fallbackName: string,
): GeoJsonFeatureCollection[] {
  const results = Array.isArray(value) ? value : [value]
  return results
    .filter(
      (item): item is GeoJsonFeatureCollection =>
        Boolean(
          item &&
            typeof item === 'object' &&
            (item as GeoJsonFeatureCollection).type === 'FeatureCollection' &&
            Array.isArray((item as GeoJsonFeatureCollection).features),
        ),
    )
    .map((collection) => ({
      ...collection,
      fileName: collection.fileName || fallbackName,
    }))
}

export async function readShapefileOverlays(
  files: File[],
  startingIndex: number,
) {
  const overlays: MapOverlay[] = []
  const notices: IngestNotice[] = []

  for (const file of files) {
    try {
      const parsed = await shp(await file.arrayBuffer())
      const collections = asCollections(parsed, file.name.replace(/\.zip$/i, ''))
      if (collections.length === 0) {
        throw new Error('No readable shapefile layers were found in the ZIP.')
      }
      collections.forEach((geojson, index) => {
        const paletteIndex = startingIndex + overlays.length
        const rawName =
          geojson.fileName || file.name.replace(/\.zip$/i, '') || 'Overlay'
        overlays.push({
          id: `${Date.now()}-${startingIndex}-${index}`,
          name: rawName.split(/[\\/]/).pop() || rawName,
          geojson,
          color: COLORS[paletteIndex % COLORS.length],
          width: 3,
          visible: true,
        })
      })
      notices.push({
        level: 'success',
        text: `${file.name}: ${collections.length} shapefile layer${collections.length === 1 ? '' : 's'} loaded`,
      })
    } catch (error) {
      notices.push({
        level: 'error',
        text: `${file.name}: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  return { overlays, notices }
}
