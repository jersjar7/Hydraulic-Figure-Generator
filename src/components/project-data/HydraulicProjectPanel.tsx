import type { WorkspaceInputCapability } from '../../core/contracts/workspace'
import type {
  CenterlineCandidate,
  MapOverlay,
  StationedAssessmentLineCollection,
} from '../../core/types'
import type { useAssessmentWorkflow } from '../../features/assessment-lines/useAssessmentWorkflow'
import type { createHydraulicProjectInputActions } from '../../features/project-workspace/hydraulicProjectInputActions'
import type { useProjectSession } from '../../features/project-session/useProjectSession'
import { ProjectDataPanel } from '../ProjectDataPanel'

type Props = {
  inputCapabilities: readonly WorkspaceInputCapability[]
  mobileOpen: boolean
  collapsed: boolean
  busy: boolean
  projectSession: ReturnType<typeof useProjectSession>
  assessmentWorkflow: ReturnType<typeof useAssessmentWorkflow>
  assessmentInterval: number
  centerlineCandidates: CenterlineCandidate[]
  stationedAssessmentLines: StationedAssessmentLineCollection | null
  overlays: MapOverlay[]
  showOverlays: boolean
  projectInputs: ReturnType<typeof createHydraulicProjectInputActions>
  toggleReviewSelection?: boolean
  onCollapse(): void
  onExpand(): void
  onMobileClose(): void
  onAssessmentIntervalChange(interval: number): void
  onGenerateAssessmentLines(): void
  onShowOverlaysChange(visible: boolean): void
  onStationingChanged?(): void
  onReset(): void
}

export function HydraulicProjectPanel({
  inputCapabilities,
  mobileOpen,
  collapsed,
  busy,
  projectSession,
  assessmentWorkflow,
  assessmentInterval,
  centerlineCandidates,
  stationedAssessmentLines,
  overlays,
  showOverlays,
  projectInputs,
  toggleReviewSelection = false,
  onCollapse,
  onExpand,
  onMobileClose,
  onAssessmentIntervalChange,
  onGenerateAssessmentLines,
  onShowOverlaysChange,
  onStationingChanged,
  onReset,
}: Props) {
  const state = assessmentWorkflow.state
  const stationingChanged = (update: () => void) => {
    update()
    onStationingChanged?.()
  }

  return (
    <ProjectDataPanel
      inputCapabilities={inputCapabilities}
      mobileOpen={mobileOpen}
      collapsed={collapsed}
      busy={busy}
      scenarios={projectSession.scenarios}
      baselineId={projectSession.baselineId}
      comparisonId={projectSession.comparisonId}
      assessmentId={projectSession.assessmentId}
      runByScenario={projectSession.runByScenario}
      assessmentLines={state.collection}
      assessmentReview={{
        view: state.panelView,
        candidates: centerlineCandidates,
        centerlineId: state.centerlineId,
        direction: state.direction,
        startStation: state.startStation,
        reviewTab: state.reviewTab,
        selectedLineId: state.selectedLineId,
        overrides: state.overrides,
        stationed: stationedAssessmentLines,
        onOpen: assessmentWorkflow.openReview,
        onBack: assessmentWorkflow.closeReview,
        onCenterlineChange: (id) =>
          stationingChanged(() => assessmentWorkflow.setCenterline(id)),
        onDirectionChange: (direction) =>
          stationingChanged(() => assessmentWorkflow.setDirection(direction)),
        onStartStationChange: (station) =>
          stationingChanged(() => assessmentWorkflow.setStartStation(station)),
        onReviewTabChange: assessmentWorkflow.setReviewTab,
        onSelectLine: (id) =>
          assessmentWorkflow.selectLine(
            toggleReviewSelection && state.selectedLineId === id ? null : id,
          ),
        onSetOverride: assessmentWorkflow.setOverride,
      }}
      overlays={overlays}
      showOverlays={showOverlays}
      onCollapse={onCollapse}
      onExpand={onExpand}
      onMobileClose={onMobileClose}
      onH5Files={projectInputs.handleH5Files}
      onOverlayFiles={projectInputs.handleOverlayFiles}
      onRemoveCondition={projectInputs.removeHydraulicCondition}
      onRenameCondition={projectInputs.renameHydraulicCondition}
      onRoleChange={projectInputs.changeScenarioRole}
      onRunChange={projectInputs.changeScenarioRun}
      runsFor={(key) => projectSession.engine.runOptions(key)}
      onAssessmentIntervalChange={onAssessmentIntervalChange}
      onGenerateAssessmentLines={onGenerateAssessmentLines}
      onClearAssessmentLines={() =>
        assessmentWorkflow.clear(assessmentInterval)
      }
      onShowOverlaysChange={onShowOverlaysChange}
      onUpdateOverlay={projectInputs.updateOverlay}
      onRemoveOverlay={projectInputs.removeOverlay}
      onReset={onReset}
    />
  )
}
