import type {
  DatasetCatalog,
  DatasetRun,
  Geometry,
} from '../types'
import type { H5File } from './h5Runtime'

function hasMeshGeometry(file: H5File, base: string) {
  try {
    const nodes = file.get(`${base}/Nodes/NodeLocs`)
    const elements = file.get(`${base}/Elements/Nodeids`)
    return (nodes.shape?.[1] ?? 0) >= 2 && (elements.shape?.[1] ?? 0) >= 3
  } catch {
    return false
  }
}

function findMeshGroup(file: H5File) {
  const module = file.get('2DMeshModule')
  return module.keys?.().find((key) => hasMeshGeometry(file, `2DMeshModule/${key}`))
}

export function readGeometry(file: H5File): Geometry {
  const meshName = findMeshGroup(file)
  if (!meshName) {
    throw new Error(
      'No SMS mesh group with Nodes/NodeLocs and Elements/Nodeids was found.',
    )
  }

  const base = `2DMeshModule/${meshName}`
  const nodeDataset = file.get(`${base}/Nodes/NodeLocs`)
  const nodeCount = nodeDataset.shape?.[0] ?? 0
  const locations = nodeDataset.value as ArrayLike<number>
  const xy = new Float64Array(nodeCount * 2)
  const z = new Float32Array(nodeCount)

  for (let index = 0; index < nodeCount; index += 1) {
    xy[index * 2] = locations[index * 3]
    xy[index * 2 + 1] = locations[index * 3 + 1]
    z[index] = locations[index * 3 + 2]
  }

  const elementDataset = file.get(`${base}/Elements/Nodeids`)
  const elementValues = elementDataset.value as ArrayLike<number>
  const elementCount = elementDataset.shape?.[0] ?? 0
  const elementWidth = elementDataset.shape?.[1] ?? 0
  const triangleIds: number[] = []

  for (let element = 0; element < elementCount; element += 1) {
    const ids: number[] = []
    for (let position = 0; position < elementWidth; position += 1) {
      const id = elementValues[element * elementWidth + position]
      if (id > 0) ids.push(id - 1)
    }
    if (ids.length >= 3) triangleIds.push(ids[0], ids[1], ids[2])
    if (ids.length === 4) triangleIds.push(ids[0], ids[2], ids[3])
  }

  let wkt: string | null = null
  try {
    const raw = file.get(`${base}/Coordinates`).attrs?.WKT?.value
    wkt = raw == null ? null : String(raw)
  } catch {
    wkt = null
  }

  return {
    meshName,
    N: nodeCount,
    xy,
    z,
    tris: new Uint32Array(triangleIds),
    wkt,
  }
}

export function isGeometryFile(file: H5File) {
  try {
    return Boolean(findMeshGroup(file))
  } catch {
    return false
  }
}

export function readDatasets(file: H5File): DatasetCatalog {
  const datasetRoot = file.get('Datasets')
  const runs: DatasetRun[] = []

  for (const name of datasetRoot.keys?.() ?? []) {
    if (name === 'Z' || name === 'Guid') continue
    const runGroup = file.get(`Datasets/${name}`)
    if (!runGroup.keys) continue
    const params: DatasetRun['params'] = {}

    for (const paramName of runGroup.keys()) {
      const paramGroup = file.get(`Datasets/${name}/${paramName}`)
      if (!paramGroup.keys?.().includes('Values')) continue
      const shape = file.get(`Datasets/${name}/${paramName}/Values`).shape ?? []
      params[paramName] = { shape, vector: shape.length === 3 }
    }

    if (Object.keys(params).length > 0) runs.push({ name, params })
  }

  return { runs }
}

export function isDatasetsFile(file: H5File) {
  try {
    return (
      file
        .get('Datasets')
        .keys?.()
        .some((key) => key !== 'Z' && key !== 'Guid') ?? false
    )
  } catch {
    return false
  }
}

export function finalTimestep(
  file: H5File,
  runName: string,
  paramName: string,
) {
  const dataset = file.get(`Datasets/${runName}/${paramName}/Values`)
  const [timeSteps, nodeCount] = dataset.shape ?? []
  const allValues = dataset.value as Float32Array
  return allValues.slice(
    (timeSteps - 1) * nodeCount,
    timeSteps * nodeCount,
  ) as Float32Array
}
