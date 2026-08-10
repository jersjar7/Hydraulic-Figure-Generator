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
  projectStatus?: ReactNode
  headerActions?: ReactNode
  saveLabel?: string
  loadLabel?: string
  mapToolbarContent?: ReactNode
  showMapActions?: boolean
  settingsHeading?: string
  onSave(): void
  onLoad(): void
  onNew?(): void
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
  projectStatus,
  headerActions,
  saveLabel,
  loadLabel,
  mapToolbarContent,
  showMapActions = true,
  settingsHeading,
  onSave,
  onLoad,
  onNew,
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
      onNew={onNew}
      onOpenLeftPanel={onOpenLeftPanel}
      onOpenRightPanel={onOpenRightPanel}
      onCloseMobilePanels={onCloseMobilePanels}
      loadInput={loadInput}
      figurePicker={figurePicker}
      projectStatus={projectStatus}
      headerActions={headerActions}
      saveLabel={saveLabel}
      loadLabel={loadLabel}
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
        toolbarContent={mapToolbarContent}
        showMapActions={showMapActions}
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
        heading={settingsHeading}
      >
        {settingsContent}
      </FigureSettingsSidebar>
    </FigureEditorShell>
  )
}
