import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ProjectFolderStoragePort } from '../../application/ports/projectFolderStorage'
import { HYDRAULIC_PROFILES_FIGURE_ID } from '../../core/figureIds'
import { browserProjectFolderStoragePort } from '../../infrastructure/browser/browserProjectFolderStoragePort'
import type { HydraulicProfileProjectState } from '../hydraulic-profiles/hydraulicProfileProjectFile'
import { serializeHydraulicProfileProject } from '../hydraulic-profiles/hydraulicProfileProjectFile'
import type { AppWorkspaceId } from '../project-workspace/hydraulicProjectWorkspaceContext'
import {
  createHydraulicProfileProjectFolder,
  openHydraulicProfileProjectFolder,
  saveHydraulicProfileProjectFolder,
  type OpenedHydraulicProfileProject,
} from './hydraulicProfileProjectFolder'

export type ProjectLifecycleDialog = 'welcome' | 'new' | null

type Options = {
  profile: HydraulicProfileProjectState
  hydrateProfile(profile: HydraulicProfileProjectState): void
  setActiveWorkspace(workspaceId: AppWorkspaceId): void
  storage?: ProjectFolderStoragePort
  now?: () => string
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function useHydraulicProjectLifecycle({
  profile,
  hydrateProfile,
  setActiveWorkspace,
  storage = browserProjectFolderStoragePort,
  now = () => new Date().toISOString(),
}: Options) {
  const initialFingerprint = useRef(serializeHydraulicProfileProject(profile))
  const [project, setProject] = useState<OpenedHydraulicProfileProject | null>(null)
  const [savedFingerprint, setSavedFingerprint] = useState(initialFingerprint.current)
  const [dialog, setDialog] = useState<ProjectLifecycleDialog>('welcome')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fingerprint = useMemo(() => serializeHydraulicProfileProject(profile), [profile])
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
        id: 'hydraulic-figure-generator-new-project',
        mode: 'readwrite',
      })
      if (!parent) return false
      const opened = await createHydraulicProfileProjectFolder({
        storage,
        parent,
        projectName,
        profile,
        timestamp: now(),
      })
      setProject(opened)
      setSavedFingerprint(fingerprint)
      setActiveWorkspace(HYDRAULIC_PROFILES_FIGURE_ID)
      setDialog(null)
      return true
    } catch (caught) {
      setError(errorMessage(caught))
      return false
    } finally {
      setBusy(false)
    }
  }, [fingerprint, now, profile, setActiveWorkspace, storage])

  const openProject = useCallback(async () => {
    if (!confirmDiscard()) return false
    setBusy(true)
    setError('')
    try {
      const directory = await storage.pickDirectory({
        id: 'hydraulic-figure-generator-open-project',
        mode: 'readwrite',
      })
      if (!directory) return false
      const opened = await openHydraulicProfileProjectFolder({ storage, directory })
      hydrateProfile(opened.profile)
      setProject(opened)
      setSavedFingerprint(serializeHydraulicProfileProject(opened.profile))
      setActiveWorkspace(HYDRAULIC_PROFILES_FIGURE_ID)
      setDialog(null)
      return true
    } catch (caught) {
      setError(errorMessage(caught))
      setDialog('welcome')
      return false
    } finally {
      setBusy(false)
    }
  }, [confirmDiscard, hydrateProfile, setActiveWorkspace, storage])

  const saveProject = useCallback(async () => {
    if (!project) {
      setDialog('new')
      return false
    }
    setBusy(true)
    setError('')
    try {
      const manifest = await saveHydraulicProfileProjectFolder({
        storage,
        directory: project.directory,
        manifest: project.manifest,
        profile,
        timestamp: now(),
      })
      setProject({ ...project, manifest, profile })
      setSavedFingerprint(fingerprint)
      return true
    } catch (caught) {
      setError(errorMessage(caught))
      throw caught
    } finally {
      setBusy(false)
    }
  }, [fingerprint, now, profile, project, storage])

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
