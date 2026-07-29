import type { MapView } from './view'

const EARTH_RADIUS = 6_378_137
const EARTH_CIRCUMFERENCE = 2 * Math.PI * EARTH_RADIUS
const TILE_CACHE_LIMIT = 256

const tileBlobCache = new Map<string, Promise<Blob | null>>()

type LoadedTile = {
  bitmap: ImageBitmap
  x: number
  y: number
  width: number
  height: number
}

const mercatorToGlobal = (
  mx: number,
  my: number,
  worldPixels: number,
) => [
  ((mx + Math.PI * EARTH_RADIUS) / EARTH_CIRCUMFERENCE) * worldPixels,
  ((Math.PI * EARTH_RADIUS - my) / EARTH_CIRCUMFERENCE) * worldPixels,
]

const globalToMercator = (
  gx: number,
  gy: number,
  worldPixels: number,
) => [
  (gx / worldPixels) * EARTH_CIRCUMFERENCE - Math.PI * EARTH_RADIUS,
  Math.PI * EARTH_RADIUS - (gy / worldPixels) * EARTH_CIRCUMFERENCE,
]

function cachedTileBlob(url: string) {
  const cached = tileBlobCache.get(url)
  if (cached) return cached

  const request = fetch(url, { mode: 'cors' })
    .then((response) => (response.ok ? response.blob() : null))
    .catch(() => null)
    .then((blob) => {
      if (!blob) tileBlobCache.delete(url)
      return blob
    })
  tileBlobCache.set(url, request)

  while (tileBlobCache.size > TILE_CACHE_LIMIT) {
    const oldest = tileBlobCache.keys().next().value
    if (!oldest) break
    tileBlobCache.delete(oldest)
  }
  return request
}

async function loadTile(
  view: MapView,
  zoom: number,
  tileX: number,
  tileY: number,
  worldPixels: number,
  signal?: AbortSignal,
): Promise<LoadedTile | null> {
  try {
    const url = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`
    const blob = await cachedTileBlob(url)
    if (!blob || signal?.aborted) return null
    const bitmap = await createImageBitmap(blob)
    const [mx0, my1] = globalToMercator(
      tileX * 256,
      tileY * 256,
      worldPixels,
    )
    const [mx1, my0] = globalToMercator(
      (tileX + 1) * 256,
      (tileY + 1) * 256,
      worldPixels,
    )
    const [localX, localY] = view.toLocal(mx0, my1)
    return {
      bitmap,
      x: localX,
      y: localY,
      width: view.scale * (mx1 - mx0),
      height: view.scale * (my1 - my0),
    }
  } catch {
    // Offline or blocked tiles leave the neutral map background visible.
    return null
  }
}

export async function drawBasemap(
  context: CanvasRenderingContext2D,
  view: MapView,
  opacity: number,
  signal?: AbortSignal,
) {
  if (opacity <= 0) return
  const zoomLevel = Math.max(
    2,
    Math.min(
      19,
      Math.round(Math.log2((view.scale * EARTH_CIRCUMFERENCE) / 256)),
    ),
  )
  const worldPixels = 256 * 2 ** zoomLevel
  const bounds = view.coverBounds()
  const [globalX0, globalY1] = mercatorToGlobal(
    bounds.x0,
    bounds.y0,
    worldPixels,
  )
  const [globalX1, globalY0] = mercatorToGlobal(
    bounds.x1,
    bounds.y1,
    worldPixels,
  )
  const tileX0 = Math.floor(globalX0 / 256)
  const tileX1 = Math.floor(globalX1 / 256)
  const tileY0 = Math.floor(globalY0 / 256)
  const tileY1 = Math.floor(globalY1 / 256)
  if ((tileX1 - tileX0 + 1) * (tileY1 - tileY0 + 1) > 400) return

  const tileJobs: Promise<LoadedTile | null>[] = []

  for (let tileX = tileX0; tileX <= tileX1; tileX += 1) {
    for (let tileY = tileY0; tileY <= tileY1; tileY += 1) {
      tileJobs.push(
        loadTile(view, zoomLevel, tileX, tileY, worldPixels, signal),
      )
    }
  }

  const tiles = await Promise.all(tileJobs)
  context.save()
  context.globalAlpha = opacity
  context.translate(view.originX, view.originY)
  context.rotate(view.rotationRadians)
  for (const tile of tiles) {
    if (!tile) continue
    context.drawImage(
      tile.bitmap,
      tile.x,
      tile.y,
      tile.width,
      tile.height,
    )
    tile.bitmap.close?.()
  }
  context.restore()
}
