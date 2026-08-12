export type ProjectCommandNotice = {
  level: 'success' | 'error'
  text: string
}

type ProjectCommandLifecycle = {
  saveProject(): Promise<boolean>
  openProject(): Promise<boolean>
  requestNewProject(): void
  confirmDiscard(): boolean
}

type Options = {
  lifecycle: ProjectCommandLifecycle
  setNotice(notice: ProjectCommandNotice | null): void
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function createProjectCommandController({
  lifecycle,
  setNotice,
}: Options) {
  return {
    async saveProject() {
      setNotice(null)
      try {
        const saved = await lifecycle.saveProject()
        if (saved) {
          setNotice({ level: 'success', text: 'Project folder saved.' })
        }
        return saved
      } catch (error) {
        setNotice({
          level: 'error',
          text: `Project save failed: ${errorMessage(error)}`,
        })
        return false
      }
    },
    async openProject() {
      setNotice(null)
      const opened = await lifecycle.openProject()
      if (opened) {
        setNotice({ level: 'success', text: 'Project folder opened.' })
      }
      return opened
    },
    requestNewProject() {
      setNotice(null)
      lifecycle.requestNewProject()
    },
    confirmWorkspaceReset(reset: () => void) {
      if (!lifecycle.confirmDiscard()) return false
      reset()
      setNotice(null)
      return true
    },
  }
}
