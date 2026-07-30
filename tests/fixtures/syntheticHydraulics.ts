import type {
  ConditionData,
  ProjectedGeometry,
  RunSelection,
  WseDifferenceScene,
} from '../../src/core/types'

export function syntheticGeometry(): ProjectedGeometry {
  return {
    meshName: 'Synthetic mesh',
    N: 4,
    xy: new Float64Array([0, 0, 100, 0, 0, 100, 100, 100]),
    z: new Float32Array([0, 0, 0, 0]),
    tris: new Uint32Array([0, 1, 2, 1, 3, 2]),
    wkt: null,
    lon: new Float64Array([0, 0, 0, 0]),
    lat: new Float64Array([0, 0, 0, 0]),
    mx: new Float64Array([0, 100, 0, 100]),
    my: new Float64Array([0, 0, 100, 100]),
    bbox: { x0: 0, x1: 100, y0: 0, y1: 100 },
    xyBbox: { x0: 0, x1: 100, y0: 0, y1: 100 },
    ftPerMerc: 1,
  }
}

export function syntheticRunSelection(
  key: string,
  label: string,
  name: string,
  projected: ProjectedGeometry,
): RunSelection {
  const condition: ConditionData = {
    key,
    label,
    kind: key === 'EX' ? 'existing' : 'proposed',
    projected,
    geometry: projected,
    datasets: { runs: [{ name, params: {} }] },
  }
  return {
    key,
    condition,
    run: condition.datasets!.runs[0],
    index: 0,
  }
}

export function syntheticWseDifferenceScene(): WseDifferenceScene {
  const existingGeometry = syntheticGeometry()
  const proposedGeometry = syntheticGeometry()
  return {
    existing: syntheticRunSelection(
      'EX',
      'Existing',
      'Existing 100YR',
      existingGeometry,
    ),
    proposed: syntheticRunSelection(
      'PR',
      'Proposed',
      'Proposed 100YR',
      proposedGeometry,
    ),
    projected: existingGeometry,
    proposedProjected: proposedGeometry,
    existingWse: new Float32Array([10, 10, 10, 10]),
    proposedWse: new Float32Array([9, 10.5, 11, 9.5]),
    existingDepth: new Float32Array([1, 1, 1, 1]),
    proposedDepth: new Float32Array([1, 1, 1, 1]),
    diff: new Float32Array([-1, 0.5, 1, -0.5]),
    wetDry: new Int8Array([0, 1, -1, 0]),
    proposedWetDry: new Int8Array([0, 0, 0, 0]),
    proposedWseWet: new Float32Array([9, 10.5, 11, 9.5]),
    maxAbs: 1,
    validDifferenceNodes: 4,
  }
}
