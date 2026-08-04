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

export type HydraulicProfileLine = SmsProfileSeries & {
  name: string
  kind: 'ground' | 'wse'
}

export type HydraulicProfileSection = {
  id: string
  sourceIndex: number
  station: number | null
  stationLabel: string
  summaryZMinimum: number | null
  thalweg: number
  groundSourceIndex: number
  sourceSeries: SmsProfileSeries[]
  ground: HydraulicProfileLine
  surfaces: HydraulicProfileLine[]
}

export type HydraulicProfileDataset = {
  sections: HydraulicProfileSection[]
  warnings: string[]
  datasetsPerSection: number
  eventNames: string[]
}

export type HydraulicProfileScene = {
  conditionLabel: string
  section: HydraulicProfileSection
}
