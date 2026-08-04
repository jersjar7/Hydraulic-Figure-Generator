import type {
  ConditionData,
  PlanViewGeometryOutputId,
  PlanViewOutputKind,
  PlanViewOutputOption,
  PlanViewResultScene,
  ScalarResultMetadata,
} from '../types'
import {
  PLAN_VIEW_MESH_ELEMENTS_ID,
  PLAN_VIEW_TOPOGRAPHY_ID,
  PLAN_VIEW_TOPOGRAPHY_MESH_ID,
} from '../types'
import { resultRange } from './scalarResultBuilder'

type GeometryDefinition = ScalarResultMetadata & {
  kind: Exclude<PlanViewOutputKind, 'scalar'>
}

const GEOMETRY_RESULTS: readonly GeometryDefinition[] = [
  {
    paramName: PLAN_VIEW_TOPOGRAPHY_ID,
    label: 'Topography',
    units: 'ft',
    defaultRamp: 'topography',
    kind: 'topography',
  },
  {
    paramName: PLAN_VIEW_MESH_ELEMENTS_ID,
    label: 'Mesh Elements',
    units: '',
    defaultRamp: 'topography',
    kind: 'mesh-elements',
  },
  {
    paramName: PLAN_VIEW_TOPOGRAPHY_MESH_ID,
    label: 'Topography + Mesh Elements',
    units: 'ft',
    defaultRamp: 'topography',
    kind: 'topography-mesh-elements',
  },
]

export function isPlanViewGeometryOutput(
  value: string,
): value is PlanViewGeometryOutputId {
  return GEOMETRY_RESULTS.some((result) => result.paramName === value)
}

export function planViewGeometryOutputOptions(
  condition?: ConditionData,
): PlanViewOutputOption[] {
  if (!condition?.projected) return []
  return GEOMETRY_RESULTS.map((result) => ({
    ...result,
    shape: [condition.projected!.N],
    runDependent: false,
  }))
}

export function buildPlanViewGeometryScene(
  condition: ConditionData,
  outputId: PlanViewGeometryOutputId,
): PlanViewResultScene {
  const projected = condition.projected
  if (!projected) throw new Error('The selected scenario needs geometry.')
  const result = GEOMETRY_RESULTS.find((item) => item.paramName === outputId)
  if (!result) throw new Error('The selected geometry output is unavailable.')
  return {
    condition,
    selection: null,
    outputKind: result.kind,
    projected,
    result,
    values: projected.z,
    ...resultRange(projected.z),
  }
}
