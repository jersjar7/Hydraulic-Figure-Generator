import proj4 from 'proj4'
import type {
  Bounds,
  Geometry,
  ProjectedGeometry,
} from '../types'

function boundsFromArrays(x: Float64Array, y: Float64Array): Bounds {
  let x0 = Number.POSITIVE_INFINITY
  let x1 = Number.NEGATIVE_INFINITY
  let y0 = Number.POSITIVE_INFINITY
  let y1 = Number.NEGATIVE_INFINITY
  for (let index = 0; index < x.length; index += 1) {
    x0 = Math.min(x0, x[index])
    x1 = Math.max(x1, x[index])
    y0 = Math.min(y0, y[index])
    y1 = Math.max(y1, y[index])
  }
  return { x0, x1, y0, y1 }
}

function boundsFromXy(xy: Float64Array): Bounds {
  let x0 = Number.POSITIVE_INFINITY
  let x1 = Number.NEGATIVE_INFINITY
  let y0 = Number.POSITIVE_INFINITY
  let y1 = Number.NEGATIVE_INFINITY
  for (let index = 0; index < xy.length / 2; index += 1) {
    x0 = Math.min(x0, xy[index * 2])
    x1 = Math.max(x1, xy[index * 2])
    y0 = Math.min(y0, xy[index * 2 + 1])
    y1 = Math.max(y1, xy[index * 2 + 1])
  }
  return { x0, x1, y0, y1 }
}

export function projectGeometry(geometry: Geometry): ProjectedGeometry {
  if (!geometry.wkt) {
    throw new Error(
      `${geometry.meshName} does not include a coordinate-system WKT definition.`,
    )
  }

  const transform = proj4(geometry.wkt, 'WGS84')
  const lon = new Float64Array(geometry.N)
  const lat = new Float64Array(geometry.N)
  const mx = new Float64Array(geometry.N)
  const my = new Float64Array(geometry.N)
  const earthRadius = 6_378_137

  for (let index = 0; index < geometry.N; index += 1) {
    const result = transform.forward([
      geometry.xy[index * 2],
      geometry.xy[index * 2 + 1],
    ])
    lon[index] = result[0]
    lat[index] = result[1]
    mx[index] = (result[0] * Math.PI * earthRadius) / 180
    my[index] =
      Math.log(Math.tan(Math.PI / 4 + (result[1] * Math.PI) / 360)) *
      earthRadius
  }

  const bbox = boundsFromArrays(mx, my)
  const xyBbox = boundsFromXy(geometry.xy)
  const ftPerMercX = (xyBbox.x1 - xyBbox.x0) / (bbox.x1 - bbox.x0 || 1)
  const ftPerMercY = (xyBbox.y1 - xyBbox.y0) / (bbox.y1 - bbox.y0 || 1)

  return {
    ...geometry,
    lon,
    lat,
    mx,
    my,
    bbox,
    xyBbox,
    ftPerMerc: Math.abs((ftPerMercX + ftPerMercY) / 2),
  }
}
