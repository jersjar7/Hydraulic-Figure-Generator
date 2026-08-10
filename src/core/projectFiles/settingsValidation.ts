import type {
  MapElementStyles,
  StationLabelOverrides,
} from '../types'
import type { ParsedProjectSettings } from './schema'
import {
  bool,
  coordinate,
  finite,
  integer,
  nullable,
  oneOf,
  ranged,
  record,
  shape,
  text,
  type UnknownRecord,
  type ValueParser,
} from './validationPrimitives'

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
      anchor: oneOf([
        'tl',
        'tc',
        'tr',
        'ml',
        'mc',
        'mr',
        'bl',
        'bc',
        'br',
      ]),
      offX: finite,
      offY: finite,
      locked: bool,
    })
  }
  return output
}

export function parseStationLabelOverrides(value: unknown, path: string) {
  const input = record(value, path)
  const output: StationLabelOverrides = {}
  for (const [stationId, stationOverride] of Object.entries(input)) {
    output[stationId] = shape(
      stationOverride,
      `${path}.${stationId}`,
      {
        visible: bool,
        labelPoint: coordinate,
        framePoint: (value, pointPath) => shape(value, pointPath, {
          x: ranged(0, 1),
          y: ranged(0, 1),
        }),
        text,
        leaderVisible: bool,
        leaderColor: text,
        leaderWidth: ranged(0.25, 12),
        leaderDashed: bool,
        leaderAttachment: oneOf([
          'auto',
          'left',
          'right',
          'top',
          'bottom',
        ] as const),
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
    overrides: parseStationLabelOverrides,
  })
}

export function settings(
  value: unknown,
  path: string,
): ParsedProjectSettings {
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
    differenceOutlineWidth: ranged(0.25, 8),
    differenceOutlinePattern: oneOf(['solid', 'dashed', 'dotted']),
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
    differenceRamp: oneOf([
      'wseDifference',
      'topography',
      'depth',
      'velocity',
      'shear',
      'waterSurface',
      'froude',
      'dvProduct',
      'surcharge',
    ] as const),
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
