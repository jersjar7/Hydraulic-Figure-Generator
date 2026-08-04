import type {
  CenterlineStationTick,
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
  sceneReady: boolean
  figureElements: ReturnType<typeof useWseFigureElementController>
  annotationController: ReturnType<typeof useWseAnnotationController>
  updateSettings: UpdateSettings
  onActiveElementChange(key: FigureElementPanelKey): void
  onStationLabelSelect(id: string | null): void
  onDryDepthChange(dryDepth: number): void
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
  sceneReady,
  figureElements,
  annotationController,
  updateSettings,
  onActiveElementChange,
  onStationLabelSelect,
  onDryDepthChange,
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
      activeElement,
      onActiveElementChange,
      onVisibilityChange: figureElements.updateElementVisibility,
      onTitleTemplateChange: (value) =>
        updateSettings('titleTemplate', value),
      onStyleChange: figureElements.updateElementStyle,
      onPositionChange: figureElements.updateElementPosition,
      onNudge: figureElements.nudgeElement,
      onResetElement: figureElements.resetElement,
      stationTicks: centerlineStationTicks,
      selectedStationLabelId,
      hasCenterline,
      onStationingChange: figureElements.updateCenterlineStationing,
      onStationLabelSelect,
      onStationLabelOverrideChange:
        figureElements.updateStationLabelOverride,
      onNudgeStationLabel: figureElements.nudgeStationLabel,
      onResetStationing: figureElements.resetCenterlineStationing,
    },
    annotations: {
      model: annotationController.model,
      actions: annotationController.actions,
    },
    export: {
      canDownload: sceneReady,
      onDownload,
    },
  }
  const ActiveSection = wseSettingsSectionByKey(activeSection).component
  return <ActiveSection context={context} />
}
