import type {
  CenterlineStationTick,
  CenterlineCandidate,
  CenterlineDirection,
  FigureElementPanelKey,
  FigureSettings,
} from '../../../core/types'
import type { SettingsSectionKey } from '../workspaceConfiguration'
import type { useWseAnnotationController } from '../useWseAnnotationController'
import type { useWseFigureElementController } from '../useWseFigureElementController'
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
  assessmentLabel: string
  activeElement: FigureElementPanelKey
  selectedStationLabelId: string | null
  centerlineStationTicks: CenterlineStationTick[]
  hasCenterline: boolean
  centerlineCandidates: CenterlineCandidate[]
  centerlineId: string
  centerlineDirection: CenterlineDirection
  startStation: number
  sceneReady: boolean
  figureElements: ReturnType<typeof useWseFigureElementController>
  annotationController: ReturnType<typeof useWseAnnotationController>
  updateSettings: UpdateSettings
  onActiveElementChange(key: FigureElementPanelKey): void
  onStationLabelSelect(id: string | null): void
  onCenterlineChange(id: string): void
  onCenterlineDirectionChange(direction: CenterlineDirection): void
  onStartStationChange(station: number): void
  onDryDepthChange(dryDepth: number): void
  onAddToExport(): void
  onDownload(): void | Promise<void>
}

export function WseSettingsContent({
  activeSection,
  settings,
  assessmentLabel,
  activeElement,
  selectedStationLabelId,
  centerlineStationTicks,
  hasCenterline,
  centerlineCandidates,
  centerlineId,
  centerlineDirection,
  startStation,
  sceneReady,
  figureElements,
  annotationController,
  updateSettings,
  onActiveElementChange,
  onStationLabelSelect,
  onCenterlineChange,
  onCenterlineDirectionChange,
  onStartStationChange,
  onDryDepthChange,
  onAddToExport,
  onDownload,
}: Props) {
  const context: WseSettingsSectionContext = {
    calculation: {
      settings,
      assessmentLabel,
      onSettingsChange: updateSettings,
      onDryDepthChange,
    },
    legend: {
      settings,
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
      onTitleTemplateChange: (value) =>
        updateSettings('titleTemplate', value),
      onStyleChange: figureElements.updateElementStyle,
      onPositionChange: figureElements.updateElementPosition,
      onNudge: figureElements.nudgeElement,
      onResetElement: figureElements.resetElement,
    },
    stationing: {
      candidates: centerlineCandidates,
      centerlineId,
      direction: centerlineDirection,
      startStation,
      settings: settings.centerlineStationing,
      ticks: centerlineStationTicks,
      selectedLabelId: selectedStationLabelId,
      hasCenterline,
      onCenterlineChange,
      onDirectionChange: onCenterlineDirectionChange,
      onStartStationChange,
      onChange: figureElements.updateCenterlineStationing,
      onSelectLabel: onStationLabelSelect,
      onOverrideChange: figureElements.updateStationLabelOverride,
      onNudgeSelected: figureElements.nudgeStationLabel,
      onReset: figureElements.resetCenterlineStationing,
    },
    annotations: {
      model: annotationController.model,
      actions: annotationController.actions,
    },
    export: {
      canDownload: sceneReady,
      onAddToExport,
      onDownload,
    },
  }
  const ActiveSection = wseSettingsSectionByKey(activeSection).component
  return <ActiveSection context={context} />
}
