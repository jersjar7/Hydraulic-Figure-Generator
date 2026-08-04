import {
  FolderOpen,
  Map,
  PanelLeft,
  PanelRight,
  Save,
} from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  inputsCollapsed: boolean
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  onSave(): void
  onLoad(): void
  onOpenLeftPanel(): void
  onOpenRightPanel(): void
  onCloseMobilePanels(): void
  loadInput?: ReactNode
  figurePicker?: ReactNode
  children: ReactNode
}

export function FigureEditorShell({
  inputsCollapsed,
  leftPanelOpen,
  rightPanelOpen,
  onSave,
  onLoad,
  onOpenLeftPanel,
  onOpenRightPanel,
  onCloseMobilePanels,
  loadInput,
  figurePicker,
  children,
}: Props) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Map size={20} />
          </div>
          <div className="brand-content">
            <h1>Hydraulic Figure Generator</h1>
            {figurePicker}
          </div>
        </div>
        <div className="topbar-actions">
          <button
            className="button secondary compact"
            type="button"
            onClick={onSave}
          >
            <Save size={16} aria-hidden="true" />
            <span>Save</span>
          </button>
          <button
            className="button secondary compact"
            type="button"
            onClick={onLoad}
          >
            <FolderOpen size={16} aria-hidden="true" />
            <span>Load</span>
          </button>
          <button
            className="icon-button mobile-panel-button"
            type="button"
            title="Open project data"
            aria-label="Open project data"
            onClick={onOpenLeftPanel}
          >
            <PanelLeft size={19} />
          </button>
          <button
            className="icon-button mobile-panel-button"
            type="button"
            title="Open figure settings"
            aria-label="Open figure settings"
            onClick={onOpenRightPanel}
          >
            <PanelRight size={19} />
          </button>
          {loadInput}
        </div>
      </header>

      <main
        className={`workspace${inputsCollapsed ? ' inputs-collapsed' : ''}`}
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
