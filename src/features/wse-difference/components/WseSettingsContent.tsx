import type {
  CenterlineStationTick,
  CenterlineCandidate,
  CenterlineDirection,
  ConditionData,
  ConditionKey,
  CartographySettings,
  FigureElementPanelKey,
  FigureSettings,
  RunSelection,
  StationedAssessmentLineCollection,
} from '../../../core/types'
import type { ReactNode } from 'react'
import type { SettingsSectionKey } from '../workspaceConfiguration'
import type { useWseAnnotationController } from '../useWseAnnotationController'
import type { useWseFigureElementController } from '../useWseFigureElementController'
import type { useAssessmentWorkflow } from '../../assessment-lines/useAssessmentWorkflow'
import {
  wseSettingsSectionByKey,
  type WseSettingsSectionContext,
} from '../wseSettingsSections'

type UpdateSettings = <Key extends keyof FigureSettings>(
  key: Key,
  value: FigureSettings[Key],
) => void

type Props = {
  activeSection: SettingsSectionKey
  settings: FigureSettings
  assessmentBusy: boolean
  assessmentScenarios: ConditionData[]
  assessmentSourceId: ConditionKey
  assessmentRun: number
  assessmentRuns: RunSelection[]
  assessmentWorkflow: ReturnType<typeof useAssessmentWorkflow>
  stationedAssessmentLines: StationedAssessmentLineCollection | null
  activeElement: FigureElementPanelKey
  selectedStationLabelId: string | null
  centerlineStationTicks: CenterlineStationTick[]
  hasCenterline: boolean
  centerlineCandidates: CenterlineCandidate[]
  centerlineId: string
  selectedCenterlineIds: string[]
  centerlineDirection: CenterlineDirection
  startStation: number
  sceneReady: boolean
  figureElements: ReturnType<typeof useWseFigureElementController>
  annotationController: ReturnType<typeof useWseAnnotationController>
  updateSettings: UpdateSettings
  onCartographyChange(value: CartographySettings): void
  onActiveElementChange(key: FigureElementPanelKey): void
  onStationLabelSelect(id: string | null): void
  onCenterlineChange(id: string): void
  onCenterlineToggle(id: string, selected: boolean): void
  onCenterlineDirectionChange(direction: CenterlineDirection): void
  onStartStationChange(station: number): void
  onDryDepthChange(dryDepth: number): void
  onAssessmentSourceChange(id: ConditionKey): void
  onAssessmentRunChange(index: number): void
  onAssessmentIntervalChange(interval: number): void
  onGenerateAssessmentLines(): void
  onClearAssessmentLines(): void
  onAssessmentCenterlineChange(id: string): void
  exportActions: ReactNode
  onDownload(): void | Promise<void>
}

export function WseSettingsContent({
  activeSection,
  settings,
  assessmentBusy,
  assessmentScenarios,
  assessmentSourceId,
  assessmentRun,
  assessmentRuns,
  assessmentWorkflow,
  stationedAssessmentLines,
  activeElement,
  selectedStationLabelId,
  centerlineStationTicks,
  hasCenterline,
  centerlineCandidates,
  centerlineId,
  selectedCenterlineIds,
  centerlineDirection,
  startStation,
  sceneReady,
  figureElements,
  annotationController,
  updateSettings,
  onCartographyChange,
  onActiveElementChange,
  onStationLabelSelect,
  onCenterlineChange,
  onCenterlineToggle,
  onCenterlineDirectionChange,
  onStartStationChange,
  onDryDepthChange,
  onAssessmentSourceChange,
  onAssessmentRunChange,
  onAssessmentIntervalChange,
  onGenerateAssessmentLines,
  onClearAssessmentLines,
  onAssessmentCenterlineChange,
  exportActions,
  onDownload,
}: Props) {
  const context: WseSettingsSectionContext = {
    calculation: {
      settings,
      onSettingsChange: updateSettings,
      onDryDepthChange,
    },
    assessmentLines: {
      busy: assessmentBusy,
      scenarios: assessmentScenarios,
      sourceId: assessmentSourceId,
      sourceRun: assessmentRun,
      sourceRuns: assessmentRuns,
      collection: assessmentWorkflow.state.collection,
      stationed: stationedAssessmentLines,
      workflow: assessmentWorkflow,
      settings,
      centerlineCandidates,
      centerlineId,
      centerlineDirection,
      startStation,
      onSourceChange: onAssessmentSourceChange,
      onSourceRunChange: onAssessmentRunChange,
      onIntervalChange: onAssessmentIntervalChange,
      onGenerate: onGenerateAssessmentLines,
      onClear: onClearAssessmentLines,
      onSettingsChange: updateSettings,
      onCenterlineChange: onAssessmentCenterlineChange,
      onCenterlineDirectionChange,
      onStartStationChange,
    },
    cartography: {
      settings,
      onCartographyChange,
      onSettingsChange: updateSettings,
    },
    frame: {
      settings,
      onSettingsChange: updateSettings,
      onResetView: figureElements.resetView,
    },
    elements: {
      settings,
      availableElements: ['title', 'diffLegend', 'wetDry', 'north', 'scale'],
      activeElement,
      onActiveElementChange,
      onVisibilityChange: figureElements.updateElementVisibility,
      onLockChange: figureElements.updateElementLock,
      onTitleTemplateChange: (value) =>
        updateSettings('titleTemplate', value),
      onStyleChange: figureElements.updateElementStyle,
      onPositionChange: figureElements.updateElementPosition,
      onNudge: figureElements.nudgeElement,
      onResetElement: figureElements.resetElement,
      onUndo: figureElements.undo,
      onRedo: figureElements.redo,
      canUndo: figureElements.canUndo,
      canRedo: figureElements.canRedo,
      undoLabel: figureElements.undoLabel,
      redoLabel: figureElements.redoLabel,
    },
    stationing: {
      candidates: centerlineCandidates,
      centerlineId,
      selectedCenterlineIds,
      direction: centerlineDirection,
      startStation,
      settings: settings.centerlineStationing,
      ticks: centerlineStationTicks,
      selectedLabelId: selectedStationLabelId,
      hasCenterline,
      onCenterlineChange,
      onCenterlineToggle,
      onDirectionChange: onCenterlineDirectionChange,
      onStartStationChange,
      onChange: figureElements.updateCenterlineStationing,
      onSelectLabel: onStationLabelSelect,
      onOverrideChange: figureElements.updateStationLabelOverride,
      onNudgeSelected: figureElements.nudgeStationLabel,
      onResetSelectedPosition: figureElements.resetStationLabelPosition,
      onReset: figureElements.resetCenterlineStationing,
    },
    annotations: {
      model: annotationController.model,
      actions: annotationController.actions,
    },
    export: {
      actions: exportActions,
      canDownload: sceneReady,
      onDownload,
    },
  }
  const ActiveSection = wseSettingsSectionByKey(activeSection).component
  return <ActiveSection context={context} />
}
