import type {
  ProjectDirectoryReference,
  ProjectFolderStoragePort,
} from '../../application/ports/projectFolderStorage'
import { HYDRAULIC_PROFILES_FIGURE_ID } from '../../core/figureIds'
import {
  HYDRAULIC_PROJECT_MANIFEST_FILE,
  HYDRAULIC_PROJECT_SCHEMA,
  HYDRAULIC_PROJECT_VERSION,
  parseHydraulicProjectManifest,
  serializeHydraulicProjectManifest,
  type HydraulicProjectManifest,
} from '../../core/projectFiles/hydraulicProjectManifest'
import {
  parseHydraulicProfileProject,
  serializeHydraulicProfileProject,
  type HydraulicProfileProjectState,
} from '../hydraulic-profiles/hydraulicProfileProjectFile'

const PROFILE_DOCUMENT_PATH = 'workspaces/hydraulic-profiles.hydfig.json'
const SUMMARY_INPUT_PATH = 'inputs/profiles/summary-table.txt'
const PROFILE_INPUT_PATH = 'inputs/profiles/profile-values.txt'

export type OpenedHydraulicProfileProject = {
  directory: ProjectDirectoryReference
  manifest: HydraulicProjectManifest
  profile: HydraulicProfileProjectState
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

function createManifest(
  projectName: string,
  timestamp: string,
): HydraulicProjectManifest {
  return {
    schema: HYDRAULIC_PROJECT_SCHEMA,
    version: HYDRAULIC_PROJECT_VERSION,
    projectName,
    createdAt: timestamp,
    updatedAt: timestamp,
    activeWorkspaceId: HYDRAULIC_PROFILES_FIGURE_ID,
    workspaces: {
      [HYDRAULIC_PROFILES_FIGURE_ID]: {
        documentPath: PROFILE_DOCUMENT_PATH,
        inputPaths: {
          summaryTable: SUMMARY_INPUT_PATH,
          profileValues: PROFILE_INPUT_PATH,
        },
      },
    },
  }
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
  const workspace = manifest.workspaces[HYDRAULIC_PROFILES_FIGURE_ID]
  if (!workspace) throw new Error('The project does not contain Hydraulic Profiles & Sections.')
  await storage.writeText(directory, workspace.inputPaths.summaryTable, profile.summaryText)
  await storage.writeText(directory, workspace.inputPaths.profileValues, profile.profileText)
  await storage.writeText(
    directory,
    workspace.documentPath,
    serializeHydraulicProfileProject(profile),
  )
  const nextManifest: HydraulicProjectManifest = {
    ...manifest,
    updatedAt: timestamp,
    activeWorkspaceId: HYDRAULIC_PROFILES_FIGURE_ID,
  }
  await storage.writeText(
    directory,
    HYDRAULIC_PROJECT_MANIFEST_FILE,
    serializeHydraulicProjectManifest(nextManifest),
  )
  return nextManifest
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
  const directoryName = hydraulicProjectDirectoryName(projectName)
  if (await storage.directoryExists(parent, directoryName)) {
    throw new Error(`A folder named "${directoryName}" already exists.`)
  }
  const directory = await storage.createDirectory(parent, directoryName)
  const manifest = await saveHydraulicProfileProjectFolder({
    storage,
    directory,
    manifest: createManifest(projectName.trim(), timestamp),
    profile,
    timestamp,
  })
  return { directory, manifest, profile }
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
  const workspace = manifest.workspaces[HYDRAULIC_PROFILES_FIGURE_ID]
  if (!workspace) throw new Error('This project does not contain Hydraulic Profiles & Sections.')
  const savedProfile = parseHydraulicProfileProject(
    await storage.readText(directory, workspace.documentPath),
  )
  const [summaryText, profileText] = await Promise.all([
    storage.readText(directory, workspace.inputPaths.summaryTable),
    storage.readText(directory, workspace.inputPaths.profileValues),
  ])
  return {
    directory,
    manifest,
    profile: { ...savedProfile, summaryText, profileText },
  }
}
