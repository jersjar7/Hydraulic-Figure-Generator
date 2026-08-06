import type {
  ProjectDirectoryReference,
  ProjectFolderStoragePort,
} from '../../application/ports/projectFolderStorage'
import {
  HYDRAULIC_PROJECT_MANIFEST_FILE,
  HYDRAULIC_PROJECT_SCHEMA,
  HYDRAULIC_PROJECT_VERSION,
  parseHydraulicProjectManifest,
  serializeHydraulicProjectManifest,
  type HydraulicProjectManifest,
} from '../../core/projectFiles/hydraulicProjectManifest'
import type {
  ProjectWorkspaceFolderBinding,
  ProjectWorkspaceHydration,
} from './projectWorkspaceFolderAdapter'

export type OpenedHydraulicProject = {
  directory: ProjectDirectoryReference
  manifest: HydraulicProjectManifest
}

export type LoadedHydraulicProject = OpenedHydraulicProject & {
  hydrations: ProjectWorkspaceHydration[]
}

export function hydraulicProjectDirectoryName(projectName: string) {
  const printableName = Array.from(projectName, (character) =>
    character.charCodeAt(0) < 32 ? '-' : character,
  ).join('')
  const sanitized = printableName
    .trim()
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/[. ]+$/g, '')
    .replace(/\s+/g, ' ')
  if (!sanitized) throw new Error('Enter a project name.')
  return sanitized
}

function createManifest({
  projectName,
  timestamp,
  activeWorkspaceId,
  workspaces,
}: {
  projectName: string
  timestamp: string
  activeWorkspaceId: string
  workspaces: ProjectWorkspaceFolderBinding[]
}): HydraulicProjectManifest {
  return {
    schema: HYDRAULIC_PROJECT_SCHEMA,
    version: HYDRAULIC_PROJECT_VERSION,
    projectName,
    createdAt: timestamp,
    updatedAt: timestamp,
    activeWorkspaceId,
    workspaces: Object.fromEntries(
      workspaces.map((workspace) => [workspace.workspaceId, workspace.defaultEntry]),
    ),
  }
}

export async function saveHydraulicProjectFolder({
  storage,
  directory,
  manifest,
  workspaces,
  activeWorkspaceId,
  timestamp,
}: {
  storage: ProjectFolderStoragePort
  directory: ProjectDirectoryReference
  manifest: HydraulicProjectManifest
  workspaces: ProjectWorkspaceFolderBinding[]
  activeWorkspaceId: string
  timestamp: string
}) {
  const workspaceEntries = { ...manifest.workspaces }
  for (const workspace of workspaces) {
    const entry = workspaceEntries[workspace.workspaceId] ?? workspace.defaultEntry
    await workspace.write({ storage, directory, entry })
    workspaceEntries[workspace.workspaceId] = entry
  }
  const nextManifest: HydraulicProjectManifest = {
    ...manifest,
    updatedAt: timestamp,
    activeWorkspaceId,
    workspaces: workspaceEntries,
  }
  await storage.writeText(
    directory,
    HYDRAULIC_PROJECT_MANIFEST_FILE,
    serializeHydraulicProjectManifest(nextManifest),
  )
  return nextManifest
}

export async function createHydraulicProjectFolder({
  storage,
  parent,
  projectName,
  workspaces,
  activeWorkspaceId,
  timestamp,
}: {
  storage: ProjectFolderStoragePort
  parent: ProjectDirectoryReference
  projectName: string
  workspaces: ProjectWorkspaceFolderBinding[]
  activeWorkspaceId: string
  timestamp: string
}): Promise<OpenedHydraulicProject> {
  const directoryName = hydraulicProjectDirectoryName(projectName)
  if (await storage.directoryExists(parent, directoryName)) {
    throw new Error(`A folder named "${directoryName}" already exists.`)
  }
  const directory = await storage.createDirectory(parent, directoryName)
  const manifest = await saveHydraulicProjectFolder({
    storage,
    directory,
    manifest: createManifest({
      projectName: projectName.trim(),
      timestamp,
      activeWorkspaceId,
      workspaces,
    }),
    workspaces,
    activeWorkspaceId,
    timestamp,
  })
  return { directory, manifest }
}

export async function openHydraulicProjectFolder({
  storage,
  directory,
  workspaces,
}: {
  storage: ProjectFolderStoragePort
  directory: ProjectDirectoryReference
  workspaces: ProjectWorkspaceFolderBinding[]
}): Promise<LoadedHydraulicProject> {
  const manifest = parseHydraulicProjectManifest(
    await storage.readText(directory, HYDRAULIC_PROJECT_MANIFEST_FILE),
  )
  const hydrations = await Promise.all(workspaces.map((workspace) => {
    const entry = manifest.workspaces[workspace.workspaceId]
    return entry
      ? workspace.read({ storage, directory, entry })
      : Promise.resolve(workspace.reset())
  }))
  return { directory, manifest, hydrations }
}
