import { HYDRAULIC_PROFILES_FIGURE_ID } from '../../core/figureIds'
import {
  parseHydraulicProfileProject,
  serializeHydraulicProfileProject,
  type HydraulicProfileProjectState,
} from '../hydraulic-profiles/hydraulicProfileProjectFile'
import type { ProjectWorkspaceFolderAdapter } from './projectWorkspaceFolderAdapter'

export const hydraulicProfileFolderAdapter: ProjectWorkspaceFolderAdapter<HydraulicProfileProjectState> = {
  workspaceId: HYDRAULIC_PROFILES_FIGURE_ID,
  defaultEntry: {
    documentPath: 'workspaces/hydraulic-profiles.hydfig.json',
    inputPaths: {
      summaryTable: 'inputs/profiles/summary-table.txt',
      profileValues: 'inputs/profiles/profile-values.txt',
    },
  },
  fingerprint: serializeHydraulicProfileProject,
  write: async ({ storage, directory, entry, state }) => {
    await storage.writeText(directory, entry.inputPaths.summaryTable, state.summaryText)
    await storage.writeText(directory, entry.inputPaths.profileValues, state.profileText)
    await storage.writeText(
      directory,
      entry.documentPath,
      serializeHydraulicProfileProject(state),
    )
  },
  read: async ({ storage, directory, entry }) => {
    const savedProfile = parseHydraulicProfileProject(
      await storage.readText(directory, entry.documentPath),
    )
    const [summaryText, profileText] = await Promise.all([
      storage.readText(directory, entry.inputPaths.summaryTable),
      storage.readText(directory, entry.inputPaths.profileValues),
    ])
    return { ...savedProfile, summaryText, profileText }
  },
}
