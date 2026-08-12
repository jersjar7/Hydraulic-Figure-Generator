import {
  FilePlus2,
  FolderOpen,
  Map,
  PanelLeft,
  PanelRight,
  Save,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEditorHeaderNavigation } from './useEditorHeaderNavigation'

type Props = {
  inputsCollapsed: boolean
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  onSave(): void
  onLoad(): void
  onNew?(): void
  onOpenLeftPanel(): void
  onOpenRightPanel(): void
  onCloseMobilePanels(): void
  loadInput?: ReactNode
  projectStatus?: ReactNode
  saveLabel?: string
  loadLabel?: string
  workspaceClassName?: string
  showPanelButtons?: boolean
  children: ReactNode
}

export function FigureEditorShell({
  inputsCollapsed,
  leftPanelOpen,
  rightPanelOpen,
  onSave,
  onLoad,
  onNew,
  onOpenLeftPanel,
  onOpenRightPanel,
  onCloseMobilePanels,
  loadInput,
  projectStatus,
  saveLabel = 'Save',
  loadLabel = 'Load',
  workspaceClassName = '',
  showPanelButtons = true,
  children,
}: Props) {
  const headerNavigation = useEditorHeaderNavigation()

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Map size={20} />
          </div>
          <div className="brand-content">
            <h1>Hydraulic Figure Generator</h1>
            {headerNavigation?.workspacePicker}
          </div>
        </div>
        <div className="topbar-actions">
          {projectStatus}
          {onNew ? (
            <button
              className="button secondary compact"
              type="button"
              onClick={onNew}
            >
              <FilePlus2 size={16} aria-hidden="true" />
              <span>New</span>
            </button>
          ) : null}
          <button
            className="button secondary compact"
            type="button"
            onClick={onSave}
          >
            <Save size={16} aria-hidden="true" />
            <span>{saveLabel}</span>
          </button>
          <button
            className="button secondary compact"
            type="button"
            onClick={onLoad}
          >
            <FolderOpen size={16} aria-hidden="true" />
            <span>{loadLabel}</span>
          </button>
          {headerNavigation?.actions}
          {showPanelButtons ? <button
            className="icon-button mobile-panel-button"
            type="button"
            title="Open project data"
            aria-label="Open project data"
            onClick={onOpenLeftPanel}
          >
            <PanelLeft size={19} />
          </button> : null}
          {showPanelButtons ? <button
            className="icon-button mobile-panel-button"
            type="button"
            title="Open figure settings"
            aria-label="Open figure settings"
            onClick={onOpenRightPanel}
          >
            <PanelRight size={19} />
          </button> : null}
          {loadInput}
        </div>
      </header>

      <main
        className={`workspace${inputsCollapsed ? ' inputs-collapsed' : ''}${workspaceClassName ? ` ${workspaceClassName}` : ''}`}
      >
        {children}
      </main>

      {(leftPanelOpen || rightPanelOpen) && (
        <button
          type="button"
          className="mobile-scrim"
          aria-label="Close side panel"
          onClick={onCloseMobilePanels}
        />
      )}
    </div>
  )
}
