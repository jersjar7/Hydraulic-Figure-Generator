import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import JSZip from 'jszip'

const outputDirectory = join(
  process.cwd(),
  'tests',
  'fixtures',
  'shapefiles',
)
const points = [
  { x: -121.00001, y: 47.00001 },
  { x: -120.99979, y: 47.00019 },
]

function writeShapefileHeader(
  view: DataView,
  byteLength: number,
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number,
) {
  view.setInt32(0, 9994, false)
  view.setInt32(24, byteLength / 2, false)
  view.setInt32(28, 1000, true)
  view.setInt32(32, 3, true)
  view.setFloat64(36, xMin, true)
  view.setFloat64(44, yMin, true)
  view.setFloat64(52, xMax, true)
  view.setFloat64(60, yMax, true)
}

function createShp() {
  const contentBytes = 80
  const bytes = new Uint8Array(100 + 8 + contentBytes)
  const view = new DataView(bytes.buffer)
  writeShapefileHeader(
    view,
    bytes.byteLength,
    points[0].x,
    points[0].y,
    points[1].x,
    points[1].y,
  )
  view.setInt32(100, 1, false)
  view.setInt32(104, contentBytes / 2, false)
  view.setInt32(108, 3, true)
  view.setFloat64(112, points[0].x, true)
  view.setFloat64(120, points[0].y, true)
  view.setFloat64(128, points[1].x, true)
  view.setFloat64(136, points[1].y, true)
  view.setInt32(144, 1, true)
  view.setInt32(148, points.length, true)
  view.setInt32(152, 0, true)
  points.forEach((point, index) => {
    const offset = 156 + index * 16
    view.setFloat64(offset, point.x, true)
    view.setFloat64(offset + 8, point.y, true)
  })
  return bytes
}

function createShx() {
  const bytes = new Uint8Array(108)
  const view = new DataView(bytes.buffer)
  writeShapefileHeader(
    view,
    bytes.byteLength,
    points[0].x,
    points[0].y,
    points[1].x,
    points[1].y,
  )
  view.setInt32(100, 50, false)
  view.setInt32(104, 40, false)
  return bytes
}

function createDbf() {
  const bytes = new Uint8Array(77)
  const view = new DataView(bytes.buffer)
  const today = new Date()
  bytes[0] = 3
  bytes[1] = today.getFullYear() - 1900
  bytes[2] = today.getMonth() + 1
  bytes[3] = today.getDate()
  view.setUint32(4, 1, true)
  view.setUint16(8, 65, true)
  view.setUint16(10, 11, true)
  new TextEncoder().encodeInto('NAME', bytes.subarray(32, 43))
  bytes[43] = 'C'.charCodeAt(0)
  bytes[48] = 10
  bytes[64] = 0x0d
  bytes[65] = 0x20
  new TextEncoder().encodeInto('Centerline', bytes.subarray(66, 76))
  bytes[76] = 0x1a
  return bytes
}

const zip = new JSZip()
zip.file('Synthetic-Centerline.shp', createShp())
zip.file('Synthetic-Centerline.shx', createShx())
zip.file('Synthetic-Centerline.dbf', createDbf())
zip.file(
  'Synthetic-Centerline.prj',
  'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433],AUTHORITY["EPSG","4326"]]',
)

await mkdir(outputDirectory, { recursive: true })
await writeFile(
  join(outputDirectory, 'Synthetic-Centerline.zip'),
  await zip.generateAsync({ type: 'uint8array' }),
)

console.log('Generated the synthetic centerline shapefile fixture.')
