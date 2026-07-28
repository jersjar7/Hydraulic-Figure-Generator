import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  conditionNodeCountsMatch,
} from '../src/core/hydraulicEngine'
import {
  findNearestNode,
  meshMatchToleranceSquared,
} from '../src/core/meshMatching'
import type {
  ConditionData,
  DatasetCatalog,
  Geometry,
  ProjectedGeometry,
} from '../src/core/types'

function geometry(
  points: Array<[number, number]>,
  triangles: number[] = [0, 1, 2],
): ProjectedGeometry {
  const mx = new Float64Array(points.map(([x]) => x))
  const my = new Float64Array(points.map(([, y]) => y))
  const x = points.map(([value]) => value)
  const y = points.map(([, value]) => value)
  const bbox = {
    x0: Math.min(...x),
    x1: Math.max(...x),
    y0: Math.min(...y),
    y1: Math.max(...y),
  }
  return {
    meshName: 'Synthetic',
    N: points.length,
    xy: new Float64Array(points.flat()),
    z: new Float32Array(points.length),
    tris: new Uint32Array(triangles),
    wkt: null,
    lon: new Float64Array(points.length),
    lat: new Float64Array(points.length),
    mx,
    my,
    bbox,
    xyBbox: bbox,
    ftPerMerc: 1,
  }
}

describe('mesh matching', () => {
  it('finds the true nearest node across an adjacent grid cell', () => {
    const projected = geometry([
      [0, 0],
      [5.01, 0],
      [100, 0],
    ])

    const match = findNearestNode(projected, 4.99, 0)

    assert.equal(match.index, 1)
    assert.ok(Math.abs(match.distance2 - 0.0004) < 1e-10)
  })

  it('finds the nearest boundary node for a point outside the mesh', () => {
    const projected = geometry([
      [0, 0],
      [10, 0],
      [0, 10],
    ])

    const match = findNearestNode(projected, 20, 1)

    assert.equal(match.index, 1)
    assert.equal(match.distance2, 101)
  })

  it('derives and caches a finite tolerance from mesh edge spacing', () => {
    const projected = geometry([
      [0, 0],
      [4, 0],
      [0, 3],
    ])

    const first = meshMatchToleranceSquared(projected)
    const second = meshMatchToleranceSquared(projected)

    assert.equal(first, 81)
    assert.equal(second, first)
  })
})

describe('condition compatibility', () => {
  const catalog = (nodeCount: number): DatasetCatalog => ({
    runs: [
      {
        name: 'Synthetic run',
        params: {
          Water_Elev_ft: { shape: [2, nodeCount], vector: false },
          Velocity_ft_p_s: { shape: [2, nodeCount, 2], vector: true },
        },
      },
    ],
  })
  const geometryRecord = {
    meshName: 'Synthetic',
    N: 3,
    xy: new Float64Array(6),
    z: new Float32Array(3),
    tris: new Uint32Array([0, 1, 2]),
    wkt: null,
  } satisfies Geometry

  it('accepts only dataset catalogs matching the geometry node count', () => {
    const condition = {
      key: 'EX',
      label: 'Existing',
      kind: 'existing',
      geometry: geometryRecord,
      datasets: catalog(3),
    } satisfies ConditionData

    assert.equal(conditionNodeCountsMatch(condition), true)
    assert.equal(
      conditionNodeCountsMatch({ ...condition, datasets: catalog(4) }),
      false,
    )
  })
})
