import type { MapElementPositions, MapElementStyles } from './figureElements'
import type { CenterlineStationingSettings } from './stationing'

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
