import {
  mkdir,
  writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'
import {
  File as H5File,
  FS,
  ready,
} from 'h5wasm'

const outputDirectory = join(process.cwd(), 'tests', 'fixtures', 'h5')

function createGeometry(fileName: string, meshName: string) {
  const path = `/${fileName}`
  const file = new H5File(path, 'w')
  file.create_group('2DMeshModule')
  const module = file.get('2DMeshModule')
  module.create_group(meshName)
  const mesh = file.get(`2DMeshModule/${meshName}`)
  mesh.create_group('Nodes')
  mesh.create_group('Elements')
  mesh.create_group('Coordinates')
  file.get(`2DMeshModule/${meshName}/Nodes`).create_dataset({
    name: 'NodeLocs',
    data: new Float64Array([
      -121.0000, 47.0000, 99.0,
      -120.9998, 47.0000, 99.2,
      -121.0000, 47.0002, 99.4,
      -120.9998, 47.0002, 99.6,
    ]),
    shape: [4, 3],
    dtype: '<f8',
  })
  file.get(`2DMeshModule/${meshName}/Elements`).create_dataset({
    name: 'Nodeids',
    data: new Int32Array([1, 2, 3, 2, 4, 3]),
    shape: [2, 3],
    dtype: '<i4',
  })
  file
    .get(`2DMeshModule/${meshName}/Coordinates`)
    .create_attribute('WKT', 'EPSG:4326')
  file.close()
  return path
}

function createDatasets(
  fileName: string,
  runName: string,
  wse: number[],
) {
  const path = `/${fileName}`
  const file = new H5File(path, 'w')
  file.create_group('Datasets')
  const datasets = file.get('Datasets')
  datasets.create_group(runName)
  const run = file.get(`Datasets/${runName}`)
  run.create_group('Water_Elev_ft')
  run.create_group('Water_Depth_ft')
  run.create_group('Velocity_ft_p_s')
  file.get(`Datasets/${runName}/Water_Elev_ft`).create_dataset({
    name: 'Values',
    data: new Float32Array(wse),
    shape: [1, 4],
    dtype: '<f4',
  })
  file.get(`Datasets/${runName}/Water_Depth_ft`).create_dataset({
    name: 'Values',
    data: new Float32Array([1, 1, 1, 1]),
    shape: [1, 4],
    dtype: '<f4',
  })
  file.get(`Datasets/${runName}/Velocity_ft_p_s`).create_dataset({
    name: 'Values',
    data: new Float32Array([
      0, 2,
      0, 2,
      0, 2,
      0, 2,
    ]),
    shape: [1, 4, 2],
    dtype: '<f4',
  })
  file.close()
  return path
}

await ready
await mkdir(outputDirectory, { recursive: true })

const fixturePaths = [
  createGeometry('Existing-Geometry.h5', 'Existing Synthetic Mesh'),
  createDatasets(
    'Existing-Datasets.h5',
    'Existing 100YR',
    [100, 100.2, 100.4, 100.6],
  ),
  createGeometry('Proposed-Geometry.h5', 'Proposed Synthetic Mesh'),
  createDatasets(
    'Proposed-Datasets.h5',
    'Proposed 100YR',
    [100.5, 100.1, 101, 100.3],
  ),
]

for (const fixturePath of fixturePaths) {
  const fileName = fixturePath.slice(1)
  await writeFile(join(outputDirectory, fileName), FS.readFile(fixturePath))
  FS.unlink(fixturePath)
}

console.log(`Generated ${fixturePaths.length} synthetic H5 fixtures.`)
