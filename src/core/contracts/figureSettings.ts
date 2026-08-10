import type { MapElementPositions, MapElementStyles } from './figureElements'
import type { CenterlineStationingSettings } from './stationing'
import type { ColorRampKey } from '../colorRamps'
import type { StrokePattern } from './cartography'

export type FigureSettings = {
  orientation: 'landscape' | 'portrait'
  dryDepth: number
  assessmentLineInterval: number
  assessmentLineColor: string
  assessmentLineWidth: number
  showAssessmentLines: boolean
  showAssessmentLabels: boolean
  assessmentLabelColor: string
  assessmentLabelFontSize: number
  assessmentLabelOffset: number
  assessmentLabelSide: 'left' | 'right' | 'alternate'
  differenceOutlineColor: string
  differenceOutlineWidth: number
  differenceOutlinePattern: StrokePattern
  showDifferenceOutlines: boolean
  showWetDry: boolean
  showOverlays: boolean
  showTitle: boolean
  showLegend: boolean
  showNorth: boolean
  showScale: boolean
  showWetDryKey: boolean
  titleTemplate: string
  legendBound: number | null
  legendInterval: number | null
  differenceRamp: ColorRampKey
  legendFontSize: number
  newlyWetColor: string
  newlyDryColor: string
  basemapOpacity: number
  rotation: number
  zoom: number
  panX: number
  panY: number
  centerlineStationing: CenterlineStationingSettings
  elementPositions: MapElementPositions
  elementStyles: MapElementStyles
}
