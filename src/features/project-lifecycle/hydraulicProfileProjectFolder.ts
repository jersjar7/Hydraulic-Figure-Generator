import type {
  ProjectDirectoryReference,
  ProjectFolderStoragePort,
} from '../../application/ports/projectFolderStorage'
import { HYDRAULIC_PROFILES_FIGURE_ID } from '../../core/figureIds'
import {
  HYDRAULIC_PROJECT_MANIFEST_FILE,
  parseHydraulicProjectManifest,
  type HydraulicProjectManifest,
} from '../../core/projectFiles/hydraulicProjectManifest'
import type { HydraulicProfileProjectState } from '../hydraulic-profiles/hydraulicProfileProjectFile'
import {
  createHydraulicProjectFolder,
  hydraulicProjectDirectoryName,
  saveHydraulicProjectFolder,
} from './hydraulicProjectFolder'
import { hydraulicProfileFolderAdapter } from './hydraulicProfileFolderAdapter'
import { bindProjectWorkspace } from './projectWorkspaceFolderAdapter'

export { hydraulicProjectDirectoryName }

export type OpenedHydraulicProfileProject = {
  directory: ProjectDirectoryReference
  manifest: HydraulicProjectManifest
  profile: HydraulicProfileProjectState
}

function profileBinding(
  profile: HydraulicProfileProjectState,
  hydrate: (profile: HydraulicProfileProjectState) => void = () => undefined,
) {
  return bindProjectWorkspace({
    adapter: hydraulicProfileFolderAdapter,
    state: profile,
    hydrate,
    createInitialState: () => profile,
  })
}

export async function saveHydraulicProfileProjectFolder({
  storage,
  directory,
  manifest,
  profile,
  timestamp,
}: {
  storage: ProjectFolderStoragePort
  directory: ProjectDirectoryReference
  manifest: HydraulicProjectManifest
  profile: HydraulicProfileProjectState
  timestamp: string
}) {
  return saveHydraulicProjectFolder({
    storage,
    directory,
    manifest,
    workspaces: [profileBinding(profile)],
    activeWorkspaceId: HYDRAULIC_PROFILES_FIGURE_ID,
    timestamp,
  })
}

export async function createHydraulicProfileProjectFolder({
  storage,
  parent,
  projectName,
  profile,
  timestamp,
}: {
  storage: ProjectFolderStoragePort
  parent: ProjectDirectoryReference
  projectName: string
  profile: HydraulicProfileProjectState
  timestamp: string
}): Promise<OpenedHydraulicProfileProject> {
  const opened = await createHydraulicProjectFolder({
    storage,
    parent,
    projectName,
    workspaces: [profileBinding(profile)],
    activeWorkspaceId: HYDRAULIC_PROFILES_FIGURE_ID,
    timestamp,
  })
  return { ...opened, profile }
}

export async function openHydraulicProfileProjectFolder({
  storage,
  directory,
}: {
  storage: ProjectFolderStoragePort
  directory: ProjectDirectoryReference
}): Promise<OpenedHydraulicProfileProject> {
  const manifest = parseHydraulicProjectManifest(
    await storage.readText(directory, HYDRAULIC_PROJECT_MANIFEST_FILE),
  )
  const entry = manifest.workspaces[HYDRAULIC_PROFILES_FIGURE_ID]
  if (!entry) {
    throw new Error('This project does not contain Hydraulic Profiles & Sections.')
  }
  const profile = await hydraulicProfileFolderAdapter.read({
    storage,
    directory,
    entry,
  })
  return { directory, manifest, profile }
}
