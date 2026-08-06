import { FolderOpen, FolderPlus, X } from 'lucide-react'
import { useState } from 'react'
import type { ProjectLifecycleDialog } from './useHydraulicProjectLifecycle'

type Props = {
  mode: ProjectLifecycleDialog
  supported: boolean
  busy: boolean
  error: string
  onNew(): void
  onCreate(projectName: string): Promise<boolean>
  onOpen(): Promise<boolean>
  onContinue(): void
  onBack(): void
}

export function ProjectStartDialog({
  mode,
  supported,
  busy,
  error,
  onNew,
  onCreate,
  onOpen,
  onContinue,
  onBack,
}: Props) {
  const [projectName, setProjectName] = useState('')
  if (!mode) return null

  return (
    <div className="project-start-backdrop">
      <section
        className="project-start-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-start-title"
      >
        <header>
          <div>
            <span className="eyebrow">Local project</span>
            <h2 id="project-start-title">
              {mode === 'new' ? 'Create project' : 'Start a project'}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close project start"
            title="Close project start"
            onClick={onContinue}
          >
            <X size={18} />
          </button>
        </header>

        {mode === 'welcome' ? (
          <div className="project-start-actions">
            <button
              type="button"
              className="project-start-action"
              disabled={!supported || busy}
              onClick={() => {
                setProjectName('')
                onNew()
              }}
            >
              <FolderPlus size={22} aria-hidden="true" />
              <span>New project</span>
            </button>
            <button
              type="button"
              className="project-start-action"
              disabled={!supported || busy}
              onClick={() => void onOpen()}
            >
              <FolderOpen size={22} aria-hidden="true" />
              <span>Open project</span>
            </button>
          </div>
        ) : (
          <form
            className="project-create-form"
            onSubmit={(event) => {
              event.preventDefault()
              void onCreate(projectName)
            }}
          >
            <label>
              <span>Project name</span>
              <input
                autoFocus
                value={projectName}
                disabled={busy}
                onChange={(event) => setProjectName(event.currentTarget.value)}
              />
            </label>
            <div className="project-dialog-buttons">
              <button type="button" className="button secondary" disabled={busy} onClick={onBack}>
                Back
              </button>
              <button type="submit" className="button primary" disabled={busy || !projectName.trim()}>
                <FolderPlus size={17} aria-hidden="true" />
                <span>{busy ? 'Creating…' : 'Choose location'}</span>
              </button>
            </div>
          </form>
        )}

        {!supported ? (
          <p className="project-dialog-message error">Folder projects are unavailable in this browser.</p>
        ) : null}
        {error ? <p className="project-dialog-message error" role="alert">{error}</p> : null}
        <button type="button" className="project-continue-link" onClick={onContinue}>
          Continue without a project
        </button>
      </section>
    </div>
  )
}
