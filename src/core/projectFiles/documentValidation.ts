import type {
  AnnotationDefaults,
  AssessmentLineOverrides,
  MapAnnotation,
  MapOverlay,
} from '../types'
import type {
  AssessmentWorkflowProject,
  ScenarioSelectionProject,
} from './schema'
import {
  bool,
  coordinate,
  finite,
  integer,
  nonemptyText,
  oneOf,
  ranged,
  record,
  shape,
  text,
  type ValueParser,
} from './validationPrimitives'

export function annotation(
  value: unknown,
  path: string,
): MapAnnotation | null {
  const input = record(value, path)
  const kind = oneOf(
    ['text', 'leader', 'arrow', 'line', 'result', 'marker'],
  )(input.kind, `${path}.kind`)
  if (kind === 'marker') return null
  if (!Array.isArray(input.points)) {
    throw new Error(`${path}.points must be an array.`)
  }

  const points = input.points.map((point, index) =>
    coordinate(point, `${path}.points[${index}]`),
  )
  const minimumPoints = kind === 'text' || kind === 'result' ? 1 : 2
  if (points.length < minimumPoints) {
    throw new Error(
      `${path}.points requires at least ${minimumPoints} points.`,
    )
  }

  const result = shape(input, path, {
    id: nonemptyText,
    kind: oneOf(['text', 'leader', 'arrow', 'line', 'result']),
    text,
    color: text,
    fillColor: text,
    lineWidth: ranged(0),
    fontSize: ranged(1),
    rotation: finite,
    dashed: bool,
    background: bool,
    resultField: oneOf([
      'summary',
      'difference',
      'existingWse',
      'proposedWse',
      'existingDepth',
      'proposedDepth',
    ]),
    hydraulicExtremum: oneOf(['max-rise', 'max-reduction']),
  })

  return {
    ...(result as Omit<MapAnnotation, 'points'>),
    rotation: (result.rotation as number | undefined) ?? 0,
    points,
  }
}

function geoJson(value: unknown, path: string) {
  const input = record(value, path)
  if (input.type !== 'FeatureCollection') {
    throw new Error(`${path}.type must be FeatureCollection.`)
  }
  if (!Array.isArray(input.features)) {
    throw new Error(`${path}.features must be an array.`)
  }
  for (let index = 0; index < input.features.length; index += 1) {
    const feature = record(
      input.features[index],
      `${path}.features[${index}]`,
    )
    if (feature.type !== 'Feature') {
      throw new Error(`${path}.features[${index}].type must be Feature.`)
    }
    if (feature.geometry !== null) {
      const geometry = record(
        feature.geometry,
        `${path}.features[${index}].geometry`,
      )
      nonemptyText(
        geometry.type,
        `${path}.features[${index}].geometry.type`,
      )
    }
  }
  return input
}

export function overlay(value: unknown, path: string): MapOverlay {
  return shape(value, path, {
    id: nonemptyText,
    name: nonemptyText,
    color: text,
    width: ranged(0),
    visible: bool,
    geojson: geoJson,
  }) as MapOverlay
}

export function annotationDefaults(value: unknown, path: string) {
  return shape(value, path, {
    text,
    color: text,
    fillColor: text,
    lineWidth: ranged(0),
    fontSize: ranged(1),
    rotation: finite,
    dashed: bool,
    background: bool,
    resultField: oneOf([
      'summary',
      'difference',
      'existingWse',
      'proposedWse',
      'existingDepth',
      'proposedDepth',
    ]),
  }) as Partial<AnnotationDefaults>
}

function assessmentOverrides(value: unknown, path: string) {
  const input = record(value, path)
  const output: AssessmentLineOverrides = {}
  for (const [lineId, lineOverride] of Object.entries(input)) {
    output[lineId] = shape(lineOverride, `${path}.${lineId}`, {
      included: bool,
      intersectionIndex: integer(0),
      labelVisible: bool,
      labelPoint: coordinate,
    }) as AssessmentLineOverrides[string]
  }
  return output
}

function centerlineStationingSource(value: unknown, path: string) {
  const input = record(value, path)
  const output: NonNullable<AssessmentWorkflowProject['stationingSource']> = {}
  if ('activeCenterlineId' in input) {
    output.activeCenterlineId = text(
      input.activeCenterlineId,
      `${path}.activeCenterlineId`,
    )
  }
  if ('centerlines' in input) {
    if (!Array.isArray(input.centerlines)) {
      throw new Error(`${path}.centerlines must be an array.`)
    }
    output.centerlines = input.centerlines.map((entry, index) =>
      shape(entry, `${path}.centerlines[${index}]`, {
        centerlineId: nonemptyText,
        direction: oneOf(['a-to-b', 'b-to-a']),
        startStation: finite,
      }) as NonNullable<
        NonNullable<AssessmentWorkflowProject['stationingSource']>['centerlines']
      >[number],
    )
  }
  return output
}

export function assessmentWorkflow(
  value: unknown,
  path: string,
): AssessmentWorkflowProject {
  return shape(value, path, {
    centerlineId: text,
    direction: oneOf(['a-to-b', 'b-to-a']),
    startStation: finite,
    stationingSource: centerlineStationingSource,
    overrides: assessmentOverrides,
  }) as AssessmentWorkflowProject
}

function keyedRecord(
  value: unknown,
  path: string,
  parser: ValueParser,
) {
  const input = record(value, path)
  const output: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(input)) {
    if (!key.trim()) {
      throw new Error(`${path} contains an empty scenario ID.`)
    }
    output[key] = parser(item, `${path}.${key}`)
  }
  return output
}

export function scenarioSelection(
  value: unknown,
  path: string,
): ScenarioSelectionProject {
  return shape(value, path, {
    baselineId: nonemptyText,
    comparisonId: nonemptyText,
    assessmentId: nonemptyText,
    runByScenario: (item, itemPath) =>
      keyedRecord(item, itemPath, integer(0)),
    labels: (item, itemPath) =>
      keyedRecord(item, itemPath, nonemptyText),
  }) as ScenarioSelectionProject
}
