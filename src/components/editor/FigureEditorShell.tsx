import { Map, PanelLeft, PanelRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEditorHeaderNavigation } from './useEditorHeaderNavigation'

type Props = {
  inputsCollapsed: boolean
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  onOpenLeftPanel(): void
  onOpenRightPanel(): void
  onCloseMobilePanels(): void
  workspaceClassName?: string
  showPanelButtons?: boolean
  children: ReactNode
}

export function FigureEditorShell({
  inputsCollapsed,
  leftPanelOpen,
  rightPanelOpen,
  onOpenLeftPanel,
  onOpenRightPanel,
  onCloseMobilePanels,
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
