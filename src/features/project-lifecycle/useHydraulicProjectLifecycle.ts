import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ProjectFolderStoragePort } from '../../application/ports/projectFolderStorage'
import { browserProjectFolderStoragePort } from '../../infrastructure/browser/browserProjectFolderStoragePort'
import type { AppWorkspaceId } from '../project-workspace/hydraulicProjectWorkspaceContext'
import {
  createHydraulicProjectFolder,
  openHydraulicProjectFolder,
  saveHydraulicProjectFolder,
  type OpenedHydraulicProject,
} from './hydraulicProjectFolder'
import {
  projectWorkspaceFingerprint,
  type ProjectWorkspaceFolderBinding,
} from './projectWorkspaceFolderAdapter'

export type ProjectLifecycleDialog = 'welcome' | 'new' | null

type Options = {
  workspaces: ProjectWorkspaceFolderBinding[]
  activeWorkspaceId: AppWorkspaceId
  setActiveWorkspace(workspaceId: AppWorkspaceId): void
  storage?: ProjectFolderStoragePort
  now?: () => string
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function persistedActiveWorkspace(
  workspaces: ProjectWorkspaceFolderBinding[],
  requested: string,
) {
  return workspaces.some(({ workspaceId }) => workspaceId === requested)
    ? requested
    : workspaces[0]?.workspaceId ?? requested
}

export function useHydraulicProjectLifecycle({
  workspaces,
  activeWorkspaceId,
  setActiveWorkspace,
  storage = browserProjectFolderStoragePort,
  now = () => new Date().toISOString(),
}: Options) {
  const fingerprint = useMemo(
    () => projectWorkspaceFingerprint(workspaces),
    [workspaces],
  )
  const initialFingerprint = useRef(fingerprint)
  const [project, setProject] = useState<OpenedHydraulicProject | null>(null)
  const [savedFingerprint, setSavedFingerprint] = useState(initialFingerprint.current)
  const [dialog, setDialog] = useState<ProjectLifecycleDialog>('welcome')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isDirty = fingerprint !== savedFingerprint

  useEffect(() => {
    if (!isDirty) return undefined
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isDirty])

  const confirmDiscard = useCallback(() =>
    !isDirty || window.confirm('This project has unsaved changes. Continue without saving them?'),
  [isDirty])

  const requestNewProject = useCallback(() => {
    if (!confirmDiscard()) return
    setError('')
    setDialog('new')
  }, [confirmDiscard])

  const createProject = useCallback(async (projectName: string) => {
    setBusy(true)
    setError('')
    try {
      const parent = await storage.pickDirectory({
        id: 'hfg-new-project',
        mode: 'readwrite',
      })
      if (!parent) return false
      const persistedWorkspaceId = persistedActiveWorkspace(workspaces, activeWorkspaceId)
      const opened = await createHydraulicProjectFolder({
        storage,
        parent,
        projectName,
        workspaces,
        activeWorkspaceId: persistedWorkspaceId,
        timestamp: now(),
      })
      setProject(opened)
      setSavedFingerprint(fingerprint)
      setActiveWorkspace(persistedWorkspaceId as AppWorkspaceId)
      setDialog(null)
      return true
    } catch (caught) {
      setError(errorMessage(caught))
      return false
    } finally {
      setBusy(false)
    }
  }, [activeWorkspaceId, fingerprint, now, setActiveWorkspace, storage, workspaces])

  const openProject = useCallback(async () => {
    if (!confirmDiscard()) return false
    setBusy(true)
    setError('')
    try {
      const directory = await storage.pickDirectory({
        id: 'hfg-open-project',
        mode: 'readwrite',
      })
      if (!directory) return false
      const opened = await openHydraulicProjectFolder({ storage, directory, workspaces })
      opened.hydrations.forEach((hydration) => hydration.apply())
      setProject({ directory: opened.directory, manifest: opened.manifest })
      setSavedFingerprint(projectWorkspaceFingerprint(opened.hydrations))
      const workspaceId = persistedActiveWorkspace(
        workspaces,
        opened.manifest.activeWorkspaceId,
      ) as AppWorkspaceId
      setActiveWorkspace(workspaceId)
      setDialog(null)
      return true
    } catch (caught) {
      setError(errorMessage(caught))
      setDialog('welcome')
      return false
    } finally {
      setBusy(false)
    }
  }, [confirmDiscard, setActiveWorkspace, storage, workspaces])

  const saveProject = useCallback(async () => {
    if (!project) {
      setDialog('new')
      return false
    }
    setBusy(true)
    setError('')
    try {
      const manifest = await saveHydraulicProjectFolder({
        storage,
        directory: project.directory,
        manifest: project.manifest,
        workspaces,
        activeWorkspaceId: persistedActiveWorkspace(workspaces, activeWorkspaceId),
        timestamp: now(),
      })
      setProject({ ...project, manifest })
      setSavedFingerprint(fingerprint)
      return true
    } catch (caught) {
      setError(errorMessage(caught))
      throw caught
    } finally {
      setBusy(false)
    }
  }, [activeWorkspaceId, fingerprint, now, project, storage, workspaces])

  return {
    project,
    projectName: project?.manifest.projectName ?? '',
    isDirty,
    isSupported: storage.isSupported(),
    dialog,
    busy,
    error,
    requestNewProject,
    openProject,
    createProject,
    saveProject,
    dismissDialog: () => { setError(''); setDialog(null) },
    showWelcome: () => { setError(''); setDialog('welcome') },
    backToWelcome: () => { setError(''); setDialog('welcome') },
    confirmDiscard,
  }
}
