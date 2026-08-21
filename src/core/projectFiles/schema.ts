import type {
  AnnotationDefaults,
  AssessmentLineOverrides,
  CenterlineDirection,
  CenterlineStationingSettings,
  FigureSettings,
  MapAnnotation,
  MapElementPositions,
  MapElementStyles,
  MapOverlay,
  StationLabelOverrides,
} from '../types'
import { WSE_DIFFERENCE_FIGURE_ID } from '../figureIds'

export const PROJECT_FILE_VERSION = 17
export const PROJECT_FIGURE = WSE_DIFFERENCE_FIGURE_ID

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

export type HydraulicFigureProjectFile = {
  version: typeof PROJECT_FILE_VERSION
  activeFigure: typeof PROJECT_FIGURE
  project: {
    overlays?: MapOverlay[]
    scenarioSelection?: ScenarioSelectionProject
  }
  figures: {
    [PROJECT_FIGURE]: {
      settings?: ProjectSettings
      annotations?: MapAnnotation[]
      annotationDefaults?: Partial<AnnotationDefaults>
      assessment?: AssessmentWorkflowProject
    }
  }
}

export type ScenarioSelectionProject = {
  baselineId?: string
  comparisonId?: string
  assessmentId?: string
  runByScenario?: Record<string, number>
  labels?: Record<string, string>
  crsOverrides?: Record<string, string>
}

export type AssessmentWorkflowProject = {
  centerlineId?: string
  direction?: CenterlineDirection
  startStation?: number
  stationingSource?: {
    activeCenterlineId?: string
    centerlines?: Array<{
      centerlineId: string
      direction: CenterlineDirection
      startStation: number
    }>
  }
  overrides?: AssessmentLineOverrides
}

export type ParsedProjectSettings = ProjectSettings & {
  showAssessmentStationLabels?: boolean
  assessmentStationLabelColor?: string
  assessmentStationLabelFontSize?: number
  assessmentStationLabelOffset?: number
  assessmentStationLabelSide?: 'left' | 'right' | 'alternate'
}
