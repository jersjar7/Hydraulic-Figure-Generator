export type MapCoordinate = {
  x: number
  y: number
}

export type WseAssessmentLine = {
  id: string
  source: string
  level: number
  points: MapCoordinate[]
  modelPoints: MapCoordinate[]
  lengthFeet: number
}

export type WseAssessmentLineCollection = {
  interval: number
  minimumLevel: number | null
  maximumLevel: number | null
  levelCount: number
  lines: WseAssessmentLine[]
}

export type CenterlineDirection = 'a-to-b' | 'b-to-a'

export type CenterlineCandidate = {
  id: string
  overlayId: string
  overlayName: string
  featureIndex: number
  partIndex: number
  mapPoints: MapCoordinate[]
  modelPoints: MapCoordinate[]
  lengthFeet: number
}

export type StationTickSide = 'both' | 'left' | 'right'

export type StationLabelSide = 'left' | 'right' | 'alternate' | 'auto'

export type StationLabelOrientation = 'horizontal' | 'aligned'

export type StationLabelOverride = {
  visible?: boolean
  labelPoint?: MapCoordinate
  text?: string
}

export type StationLabelOverrides = Record<string, StationLabelOverride>

export type CenterlineStationingSettings = {
  visible: boolean
  showMinorTicks: boolean
  showMajorTicks: boolean
  showLabels: boolean
  minorInterval: number
  majorInterval: number
  labelInterval: number
  rangeStart: number | null
  rangeEnd: number | null
  minorTickLength: number
  majorTickLength: number
  minorLineWidth: number
  majorLineWidth: number
  tickSide: StationTickSide
  tickColor: string
  labelColor: string
  labelFontSize: number
  labelOffset: number
  labelSide: StationLabelSide
  labelOrientation: StationLabelOrientation
  labelHalo: boolean
  prefix: string
  decimalPlaces: 0 | 1 | 2
  showEndpoints: boolean
  showDirectionArrow: boolean
  overrides: StationLabelOverrides
}

export type CenterlineStationTick = {
  id: string
  stationFeet: number
  centerlineOffsetFeet: number
  mapPoint: MapCoordinate
  mapTangent: MapCoordinate
  minor: boolean
  major: boolean
  label: boolean
}

export type CenterlineStationLayer = {
  centerline: CenterlineCandidate
  direction: CenterlineDirection
  ticks: CenterlineStationTick[]
  selectedLabelId?: string | null
}

export type AssessmentLineOverride = {
  included?: boolean
  intersectionIndex?: number
  labelVisible?: boolean
  labelPoint?: MapCoordinate
}

export type AssessmentLineOverrides = Record<string, AssessmentLineOverride>

export type AssessmentIntersection = {
  index: number
  mapPoint: MapCoordinate
  modelPoint: MapCoordinate
  mapTangent: MapCoordinate
  centerlineOffsetFeet: number
  stationFeet: number
}

export type StationedAssessmentLineStatus =
  | 'included'
  | 'review'
  | 'excluded'

export type StationedAssessmentLine = {
  line: WseAssessmentLine
  intersections: AssessmentIntersection[]
  selectedIntersectionIndex: number | null
  selectedIntersection: AssessmentIntersection | null
  status: StationedAssessmentLineStatus
  reason: string
  warnings: string[]
}

export type StationedAssessmentLineCollection = {
  centerline: CenterlineCandidate
  direction: CenterlineDirection
  startStation: number
  items: StationedAssessmentLine[]
  includedCount: number
  reviewCount: number
  excludedCount: number
}

export type AssessmentWseCallout = {
  lineId: string
  text: string
  target: MapCoordinate
  tangent: MapCoordinate
  labelPoint?: MapCoordinate
}

export type AssessmentMapLayer = {
  lines: WseAssessmentLine[]
  centerlineStationing?: CenterlineStationLayer
  wseCallouts?: AssessmentWseCallout[]
  selectedCalloutId?: string | null
  selectedLine?: WseAssessmentLine | null
  endpoints?: {
    a: MapCoordinate
    b: MapCoordinate
  } | null
  intersections?: {
    point: MapCoordinate
    index: number
    selected: boolean
  }[]
}

