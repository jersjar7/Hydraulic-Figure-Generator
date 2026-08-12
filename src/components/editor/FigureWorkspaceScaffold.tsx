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
  mapToolbarContent?: ReactNode
  showMapActions?: boolean
  settingsHeading?: string
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
  mapToolbarContent,
  showMapActions = true,
  settingsHeading,
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
      onOpenLeftPanel={onOpenLeftPanel}
      onOpenRightPanel={onOpenRightPanel}
      onCloseMobilePanels={onCloseMobilePanels}
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
