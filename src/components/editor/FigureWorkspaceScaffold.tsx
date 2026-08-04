import type { ReactNode } from 'react'
import type { IngestNotice } from '../../core/types'
import { FigureEditorShell } from './FigureEditorShell'
import { FigureMapWorkspace } from './FigureMapWorkspace'
import {
  FigureSettingsSidebar,
  type FigureSettingsSection,
} from './FigureSettingsSidebar'
import { useSectionTabNavigation } from './useSectionTabNavigation'

type Props<Key extends string> = {
  figureLabel: string
  comparisonDescription: string
  inputsCollapsed: boolean
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  busy: boolean
  notices: IngestNotice[]
  settingsSections: readonly FigureSettingsSection<Key>[]
  activeSettingsSection: Key
  projectPanel: ReactNode
  mapContent: ReactNode
  settingsContent: ReactNode
  settingsFooter?: ReactNode
  loadInput?: ReactNode
  figurePicker?: ReactNode
  onSave(): void
  onLoad(): void
  onOpenLeftPanel(): void
  onOpenRightPanel(): void
  onCloseMobilePanels(): void
  onCloseSettingsPanel(): void
  onSettingsSectionChange(section: Key): void
  onZoomOut(): void
  onZoomIn(): void
  onFitFrame(): void
}

export function FigureWorkspaceScaffold<Key extends string>({
  figureLabel,
  comparisonDescription,
  inputsCollapsed,
  leftPanelOpen,
  rightPanelOpen,
  busy,
  notices,
  settingsSections,
  activeSettingsSection,
  projectPanel,
  mapContent,
  settingsContent,
  settingsFooter,
  loadInput,
  figurePicker,
  onSave,
  onLoad,
  onOpenLeftPanel,
  onOpenRightPanel,
  onCloseMobilePanels,
  onCloseSettingsPanel,
  onSettingsSectionChange,
  onZoomOut,
  onZoomIn,
  onFitFrame,
}: Props<Key>) {
  const handleSettingsTabKeyDown = useSectionTabNavigation(
    settingsSections,
    onSettingsSectionChange,
  )

  return (
    <FigureEditorShell
      inputsCollapsed={inputsCollapsed}
      leftPanelOpen={leftPanelOpen}
      rightPanelOpen={rightPanelOpen}
      onSave={onSave}
      onLoad={onLoad}
      onOpenLeftPanel={onOpenLeftPanel}
      onOpenRightPanel={onOpenRightPanel}
      onCloseMobilePanels={onCloseMobilePanels}
      loadInput={loadInput}
      figurePicker={figurePicker}
    >
      {projectPanel}
      <FigureMapWorkspace
        figureLabel={figureLabel}
        comparisonDescription={comparisonDescription}
        busy={busy}
        notices={notices}
        onZoomOut={onZoomOut}
        onZoomIn={onZoomIn}
        onFitFrame={onFitFrame}
      >
        {mapContent}
      </FigureMapWorkspace>
      <FigureSettingsSidebar<Key>
        mobileOpen={rightPanelOpen}
        sections={settingsSections}
        activeSection={activeSettingsSection}
        onSectionChange={onSettingsSectionChange}
        onSectionKeyDown={handleSettingsTabKeyDown}
        onMobileClose={onCloseSettingsPanel}
        footer={settingsFooter}
      >
        {settingsContent}
      </FigureSettingsSidebar>
    </FigureEditorShell>
  )
}
