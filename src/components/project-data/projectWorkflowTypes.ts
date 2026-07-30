import type {
  ConditionData,
  ConditionKey,
  MapOverlay,
  RunSelection,
  ScenarioRole,
  StationedAssessmentLineCollection,
  WseAssessmentLineCollection,
} from '../../core/types'
import type {
  AssessmentLinesReviewPanelProps,
} from '../../features/assessment-lines/AssessmentLinesReviewPanel'
import type {
  AssessmentStationingControlsProps,
} from '../../features/assessment-lines/AssessmentStationingControls'
import type {
  AssessmentPanelView,
} from '../../features/assessment-lines/useAssessmentWorkflow'

export type AssessmentReviewProps = AssessmentLinesReviewPanelProps &
  AssessmentStationingControlsProps & {
    view: AssessmentPanelView
    onOpen(): void
    onBack(): void
  }

export type ProjectDataPanelProps = {
  mobileOpen: boolean
  collapsed: boolean
  busy: boolean
  scenarios: ConditionData[]
  baselineId: ConditionKey
  comparisonId: ConditionKey
  assessmentId: ConditionKey
  runByScenario: Record<ConditionKey, number>
  assessmentLines: WseAssessmentLineCollection
  assessmentReview: AssessmentReviewProps
  overlays: MapOverlay[]
  showOverlays: boolean
  onCollapse(): void
  onExpand(): void
  onMobileClose(): void
  onH5Files(files: File[]): void
  onOverlayFiles(files: File[]): void
  onRemoveCondition(key: ConditionKey): void
  onRenameCondition(key: ConditionKey, label: string): void
  onRoleChange(role: ScenarioRole, key: ConditionKey): void
  onRunChange(key: ConditionKey, index: number): void
  runsFor(key: ConditionKey): RunSelection[]
  onAssessmentIntervalChange(interval: number): void
  onGenerateAssessmentLines(): void
  onClearAssessmentLines(): void
  onShowOverlaysChange(visible: boolean): void
  onUpdateOverlay(id: string, patch: Partial<MapOverlay>): void
  onRemoveOverlay(id: string): void
  onReset(): void
}

export type ProjectWorkflowContext = ProjectDataPanelProps & {
  stationed: StationedAssessmentLineCollection | null
  sourceLabel: string
  hasSourceRuns: boolean
  openReview(): void
}
