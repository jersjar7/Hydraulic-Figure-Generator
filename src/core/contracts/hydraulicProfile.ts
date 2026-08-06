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
}
