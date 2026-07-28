import type {
  AnnotationDefaults,
  AssessmentLineOverrides,
  CenterlineStationingSettings,
  CenterlineDirection,
  FigureSettings,
  MapAnnotation,
  MapElementPositions,
  MapElementStyles,
  MapOverlay,
  StationLabelOverrides,
} from './types'

export const PROJECT_FILE_VERSION = 13
export const PROJECT_FIGURE = 'fra-wse-difference'

type PartialElementStyles = {
  [Key in keyof MapElementStyles]?: Partial<MapElementStyles[Key]>
}

export type ProjectSettings = Omit<
  Partial<FigureSettings>,
  'centerlineStationing' | 'elementPositions' | 'elementStyles'
> & {
  contourColor?: string
  showContours?: boolean
  centerlineStationing?: Partial<
    Omit<CenterlineStationingSettings, 'overrides'>
  > & {
    overrides?: StationLabelOverrides
  }
  elementPositions?: Partial<MapElementPositions>
  elementStyles?: PartialElementStyles
}

export type HydraulicFigureProject = {
  version: number
  figure: typeof PROJECT_FIGURE
  settings?: ProjectSettings
  overlays?: MapOverlay[]
  annotations?: MapAnnotation[]
  annotationDefaults?: Partial<AnnotationDefaults>
  selectedRuns?: {
    existingRun?: number
    proposedRun?: number
  }
  scenarioSelection?: ScenarioSelectionProject
  assessment?: AssessmentWorkflowProject
}

export type ScenarioSelectionProject = {
  baselineId?: string
  comparisonId?: string
  assessmentId?: string
  runByScenario?: Record<string, number>
  labels?: Record<string, string>
}

export type AssessmentWorkflowProject = {
  centerlineId?: string
  direction?: CenterlineDirection
  startStation?: number
  overrides?: AssessmentLineOverrides
}

type ParsedProjectSettings = ProjectSettings & {
  showAssessmentStationLabels?: boolean
  assessmentStationLabelColor?: string
  assessmentStationLabelFontSize?: number
  assessmentStationLabelOffset?: number
  assessmentStationLabelSide?: 'left' | 'right' | 'alternate'
}

type UnknownRecord = Record<string, unknown>
type ValueParser = (value: unknown, path: string) => unknown

function record(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`)
  }
  return value as UnknownRecord
}

function text(value: unknown, path: string) {
  if (typeof value !== 'string') throw new Error(`${path} must be text.`)
  return value
}

function nonemptyText(value: unknown, path: string) {
  const result = text(value, path)
  if (!result.trim()) throw new Error(`${path} cannot be empty.`)
  return result
}

function bool(value: unknown, path: string) {
  if (typeof value !== 'boolean') throw new Error(`${path} must be true or false.`)
  return value
}

function finite(value: unknown, path: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number.`)
  }
  return value
}

function ranged(minimum: number, maximum = Number.POSITIVE_INFINITY): ValueParser {
  return (value, path) => {
    const result = finite(value, path)
    if (result < minimum || result > maximum) {
      throw new Error(`${path} must be between ${minimum} and ${maximum}.`)
    }
    return result
  }
}

function integer(minimum = Number.NEGATIVE_INFINITY): ValueParser {
  return (value, path) => {
    const result = finite(value, path)
    if (!Number.isInteger(result) || result < minimum) {
      throw new Error(`${path} must be an integer of at least ${minimum}.`)
    }
    return result
  }
}

function nullable(parser: ValueParser): ValueParser {
  return (value, path) => (value === null ? null : parser(value, path))
}

function oneOf<const Values extends readonly (string | number)[]>(
  values: Values,
): ValueParser {
  return (value, path) => {
    if (!values.includes(value as never)) {
      throw new Error(`${path} must be one of: ${values.join(', ')}.`)
    }
    return value
  }
}

function shape(
  value: unknown,
  path: string,
  fields: Record<string, ValueParser>,
) {
  const input = record(value, path)
  const output: UnknownRecord = {}
  for (const [key, parser] of Object.entries(fields)) {
    if (!(key in input)) continue
    output[key] = parser(input[key], `${path}.${key}`)
  }
  return output
}

const boxStyleFields = {
  background: bool,
  backgroundColor: text,
  backgroundOpacity: ranged(0, 1),
  borderColor: text,
  borderWidth: ranged(0),
}

const elementStyleParsers: Record<keyof MapElementStyles, ValueParser> = {
  title: (value, path) =>
    shape(value, path, {
      ...boxStyleFields,
      fontSize: ranged(1),
      fontWeight: oneOf([400, 600, 700] as const),
      textColor: text,
      alignment: oneOf(['left', 'center', 'right'] as const),
      maxWidth: ranged(1),
    }),
  diffLegend: (value, path) =>
    shape(value, path, {
      ...boxStyleFields,
      title: text,
      units: text,
      orientation: oneOf(['vertical', 'horizontal'] as const),
      fontSize: ranged(1),
      decimalPlaces: integer(0),
      swatchSize: ranged(1),
      textColor: text,
    }),
  wetDry: (value, path) =>
    shape(value, path, {
      ...boxStyleFields,
      title: text,
      wetLabel: text,
      dryLabel: text,
      orientation: oneOf(['vertical', 'horizontal'] as const),
      fontSize: ranged(1),
      swatchSize: ranged(1),
      textColor: text,
    }),
  north: (value, path) =>
    shape(value, path, {
      ...boxStyleFields,
      style: oneOf(['classic', 'simple', 'compass'] as const),
      size: ranged(1),
      color: text,
      showLabel: bool,
      rotationMode: oneOf(['true-north', 'page-up'] as const),
    }),
  scale: (value, path) =>
    shape(value, path, {
      ...boxStyleFields,
      lengthMode: oneOf(['auto', 'manual'] as const),
      manualLength: ranged(0),
      units: oneOf(['us-survey-ft', 'ft', 'mi', 'm'] as const),
      divisions: integer(1),
      style: oneOf(['alternating', 'ticks'] as const),
      decimalPlaces: integer(0),
      fontSize: ranged(1),
      lineColor: text,
      fillColor: text,
      textColor: text,
    }),
}

function elementStyles(value: unknown, path: string) {
  const input = record(value, path)
  const output: UnknownRecord = {}
  for (const [key, parser] of Object.entries(elementStyleParsers)) {
    if (!(key in input)) continue
    output[key] = parser(input[key], `${path}.${key}`)
  }
  return output
}

function elementPositions(value: unknown, path: string) {
  const input = record(value, path)
  const output: UnknownRecord = {}
  for (const key of ['title', 'diffLegend', 'north', 'scale', 'wetDry']) {
    if (!(key in input)) continue
    output[key] = shape(input[key], `${path}.${key}`, {
      anchor: oneOf(['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br']),
      offX: finite,
      offY: finite,
    })
  }
  return output
}

function stationLabelOverrides(value: unknown, path: string) {
  const input = record(value, path)
  const output: StationLabelOverrides = {}
  for (const [stationId, stationOverride] of Object.entries(input)) {
    output[stationId] = shape(
      stationOverride,
      `${path}.${stationId}`,
      {
        visible: bool,
        labelPoint: coordinate,
        text,
      },
    )
  }
  return output
}

function centerlineStationing(value: unknown, path: string) {
  return shape(value, path, {
    visible: bool,
    showMinorTicks: bool,
    showMajorTicks: bool,
    showLabels: bool,
    minorInterval: ranged(Number.EPSILON),
    majorInterval: ranged(Number.EPSILON),
    labelInterval: ranged(Number.EPSILON),
    rangeStart: nullable(finite),
    rangeEnd: nullable(finite),
    minorTickLength: ranged(1, 100),
    majorTickLength: ranged(1, 160),
    minorLineWidth: ranged(0.25, 12),
    majorLineWidth: ranged(0.25, 16),
    tickSide: oneOf(['both', 'left', 'right']),
    tickColor: text,
    labelColor: text,
    labelFontSize: ranged(6, 72),
    labelOffset: ranged(0, 160),
    labelSide: oneOf(['left', 'right', 'alternate', 'auto']),
    labelOrientation: oneOf(['horizontal', 'aligned']),
    labelHalo: bool,
    prefix: text,
    decimalPlaces: oneOf([0, 1, 2]),
    showEndpoints: bool,
    showDirectionArrow: bool,
    overrides: stationLabelOverrides,
  })
}

function settings(value: unknown, path: string): ParsedProjectSettings {
  return shape(value, path, {
    orientation: oneOf(['landscape', 'portrait']),
    dryDepth: ranged(0),
    assessmentLineInterval: ranged(Number.EPSILON),
    assessmentLineColor: text,
    assessmentLineWidth: ranged(0.25, 12),
    showAssessmentLines: bool,
    showAssessmentLabels: bool,
    assessmentLabelColor: text,
    assessmentLabelFontSize: ranged(6, 72),
    assessmentLabelOffset: ranged(0, 120),
    assessmentLabelSide: oneOf(['left', 'right', 'alternate']),
    showAssessmentStationLabels: bool,
    assessmentStationLabelColor: text,
    assessmentStationLabelFontSize: ranged(6, 72),
    assessmentStationLabelOffset: ranged(0, 120),
    assessmentStationLabelSide: oneOf(['left', 'right', 'alternate']),
    differenceOutlineColor: text,
    showDifferenceOutlines: bool,
    showWetDry: bool,
    showOverlays: bool,
    showTitle: bool,
    showLegend: bool,
    showNorth: bool,
    showScale: bool,
    showWetDryKey: bool,
    titleTemplate: text,
    legendBound: nullable(ranged(Number.EPSILON)),
    legendInterval: nullable(ranged(Number.EPSILON)),
    legendFontSize: ranged(1),
    newlyWetColor: text,
    newlyDryColor: text,
    basemapOpacity: ranged(0, 1),
    rotation: finite,
    zoom: ranged(Number.EPSILON),
    panX: finite,
    panY: finite,
    centerlineStationing,
    contourColor: text,
    showContours: bool,
    elementPositions,
    elementStyles,
  }) as ParsedProjectSettings
}

function migrateAssessmentLabelSettings(
  parsed: ParsedProjectSettings,
): ProjectSettings {
  const {
    showAssessmentStationLabels,
    assessmentStationLabelColor,
    assessmentStationLabelFontSize,
    assessmentStationLabelOffset,
    assessmentStationLabelSide,
    ...current
  } = parsed
  const migrated: ProjectSettings = { ...current }
  const showLabels =
    current.showAssessmentLabels ?? showAssessmentStationLabels
  const color = current.assessmentLabelColor ?? assessmentStationLabelColor
  const fontSize =
    current.assessmentLabelFontSize ?? assessmentStationLabelFontSize
  const offset = current.assessmentLabelOffset ?? assessmentStationLabelOffset
  const side = current.assessmentLabelSide ?? assessmentStationLabelSide
  if (showLabels !== undefined) migrated.showAssessmentLabels = showLabels
  if (color !== undefined) migrated.assessmentLabelColor = color
  if (fontSize !== undefined) migrated.assessmentLabelFontSize = fontSize
  if (offset !== undefined) migrated.assessmentLabelOffset = offset
  if (side !== undefined) migrated.assessmentLabelSide = side
  return migrated
}

function coordinate(value: unknown, path: string) {
  return shape(value, path, { x: finite, y: finite }) as {
    x: number
    y: number
  }
}

function annotation(value: unknown, path: string): MapAnnotation | null {
  const input = record(value, path)
  const kind = oneOf(
    ['text', 'leader', 'arrow', 'line', 'result', 'marker'],
  )(input.kind, `${path}.kind`)
  if (kind === 'marker') return null
  if (!Array.isArray(input.points)) throw new Error(`${path}.points must be an array.`)

  const points = input.points.map((point, index) =>
    coordinate(point, `${path}.points[${index}]`),
  )
  const minimumPoints = kind === 'text' || kind === 'result' ? 1 : 2
  if (points.length < minimumPoints) {
    throw new Error(`${path}.points requires at least ${minimumPoints} points.`)
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
    const feature = record(input.features[index], `${path}.features[${index}]`)
    if (feature.type !== 'Feature') {
      throw new Error(`${path}.features[${index}].type must be Feature.`)
    }
    if (feature.geometry !== null) {
      const geometry = record(
        feature.geometry,
        `${path}.features[${index}].geometry`,
      )
      nonemptyText(geometry.type, `${path}.features[${index}].geometry.type`)
    }
  }
  return input
}

function overlay(value: unknown, path: string): MapOverlay {
  const result = shape(value, path, {
    id: nonemptyText,
    name: nonemptyText,
    color: text,
    width: ranged(0),
    visible: bool,
    geojson: geoJson,
  })
  return result as MapOverlay
}

function annotationDefaults(value: unknown, path: string) {
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
    const parsed = shape(lineOverride, `${path}.${lineId}`, {
      included: bool,
      intersectionIndex: integer(0),
      labelVisible: bool,
      labelPoint: coordinate,
    }) as AssessmentLineOverrides[string]
    output[lineId] = parsed
  }
  return output
}

function assessmentWorkflow(
  value: unknown,
  path: string,
): AssessmentWorkflowProject {
  return shape(value, path, {
    centerlineId: text,
    direction: oneOf(['a-to-b', 'b-to-a']),
    startStation: finite,
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
    if (!key.trim()) throw new Error(`${path} contains an empty scenario ID.`)
    output[key] = parser(item, `${path}.${key}`)
  }
  return output
}

function scenarioSelection(
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

export function createHydraulicFigureProject(
  project: Omit<HydraulicFigureProject, 'version' | 'figure'>,
): HydraulicFigureProject {
  return {
    version: PROJECT_FILE_VERSION,
    figure: PROJECT_FIGURE,
    ...project,
  }
}

export function parseHydraulicFigureProject(
  source: string,
): HydraulicFigureProject {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch {
    throw new Error('The project file is not valid JSON.')
  }

  const input = record(parsed, 'Project')
  const version =
    input.version === undefined ? 1 : (integer(1)(input.version, 'Project.version') as number)
  if (version > PROJECT_FILE_VERSION) {
    throw new Error(
      `This project uses version ${version}; this app supports through version ${PROJECT_FILE_VERSION}.`,
    )
  }
  if (input.figure !== undefined && input.figure !== PROJECT_FIGURE) {
    throw new Error(`This file is for a different figure type: ${String(input.figure)}.`)
  }

  const result: HydraulicFigureProject = {
    version: PROJECT_FILE_VERSION,
    figure: PROJECT_FIGURE,
  }
  if (input.settings !== undefined) {
    result.settings = migrateAssessmentLabelSettings(
      settings(input.settings, 'Project.settings'),
    )
  }
  if (input.overlays !== undefined) {
    if (!Array.isArray(input.overlays)) {
      throw new Error('Project.overlays must be an array.')
    }
    result.overlays = input.overlays.map((item, index) =>
      overlay(item, `Project.overlays[${index}]`),
    )
  }
  if (input.annotations !== undefined) {
    if (!Array.isArray(input.annotations)) {
      throw new Error('Project.annotations must be an array.')
    }
    result.annotations = input.annotations
      .map((item, index) => annotation(item, `Project.annotations[${index}]`))
      .filter((item): item is MapAnnotation => item !== null)
  }
  if (input.annotationDefaults !== undefined) {
    result.annotationDefaults = annotationDefaults(
      input.annotationDefaults,
      'Project.annotationDefaults',
    )
  }
  if (input.selectedRuns !== undefined) {
    result.selectedRuns = shape(input.selectedRuns, 'Project.selectedRuns', {
      existingRun: integer(0),
      proposedRun: integer(0),
    })
  }
  if (input.scenarioSelection !== undefined) {
    result.scenarioSelection = scenarioSelection(
      input.scenarioSelection,
      'Project.scenarioSelection',
    )
  } else if (result.selectedRuns) {
    result.scenarioSelection = {
      baselineId: 'EX',
      comparisonId: 'PR',
      assessmentId: 'EX',
      runByScenario: {
        EX: result.selectedRuns.existingRun ?? 0,
        PR: result.selectedRuns.proposedRun ?? 0,
      },
    }
  }
  if (input.assessment !== undefined) {
    result.assessment = assessmentWorkflow(
      input.assessment,
      'Project.assessment',
    )
  }
  return result
}
