export type SmsSummaryRow = {
  reach: string
  station: number
  zMinimum: number | null
}

export type SmsProfileSeries = {
  id: string
  sourceIndex: number
  distances: number[]
  elevations: Array<number | null>
}

export type HydraulicProfileLineKind = 'ground' | 'wse' | 'other'

export type HydraulicProfileLine = SmsProfileSeries & {
  datasetSlot: number
  name: string
  kind: HydraulicProfileLineKind
}

export type HydraulicProfileDatasetDefinition = {
  slot: number
  name: string
  kind: HydraulicProfileLineKind
}

export type HydraulicProfileDatasetConfiguration = {
  datasetsPerSection: number
  definitions: HydraulicProfileDatasetDefinition[]
  stationReferenceSlot: number | null
}

export type HydraulicProfileMappingStatus = {
  ready: boolean
  referenceSlot: number | null
  recommendedSlot: number | null
  source: 'configured' | 'detected' | 'unresolved'
  message: string | null
}

export type HydraulicProfileSection = {
  id: string
  sourceIndex: number
  station: number | null
  stationLabel: string
  summaryZMinimum: number | null
  thalweg: number
  sourceSeries: SmsProfileSeries[]
  lines: HydraulicProfileLine[]
  grounds: HydraulicProfileLine[]
  surfaces: HydraulicProfileLine[]
  otherLines: HydraulicProfileLine[]
  primaryGround: HydraulicProfileLine | null
  stationReferenceLine: HydraulicProfileLine | null
}

export type HydraulicProfileDataset = {
  sections: HydraulicProfileSection[]
  warnings: string[]
  seriesCount: number
  datasetsPerSection: number
  inferredDatasetsPerSection: number | null
  structureSource: 'configured' | 'summary' | 'unresolved'
  configuration: HydraulicProfileDatasetConfiguration | null
  mappingStatus: HydraulicProfileMappingStatus
}

export type HydraulicProfileScene = {
  conditionLabel: string
  section: HydraulicProfileSection
  culvert?: HydraulicCrossSectionCulvert | null
}

export type HydraulicProfileView = 'cross-sections' | 'longitudinal'

export type HydraulicCulvertKind = 'box' | 'arch' | 'circle' | 'ellipse'

export type HydraulicCrossSectionCulvert = {
  sectionId: string
  name: string
  kind: HydraulicCulvertKind
  scour: number
  bed: number
  center: number | null
  width: number
  height: number
  span: number
  legHeight: number
  rise: number
  diameter: number
  color: string
  lineWidth: number
  dash: number[]
}

export type HydraulicLongitudinalCulvert = {
  id: string
  name: string
  leftStation: number
  rightStation: number
  invertLeft: number
  invertRight: number
  height: number
  color: string
  lineWidth: number
  dash: number[]
}

export type HydraulicLongitudinalMarker = {
  station: number
  label: string
}

export type HydraulicLongitudinalScene = {
  conditionLabel: string
  lines: HydraulicProfileLine[]
  grounds: HydraulicProfileLine[]
  surfaces: HydraulicProfileLine[]
  markers: HydraulicLongitudinalMarker[]
  culverts: HydraulicLongitudinalCulvert[]
  warnings: string[]
}
