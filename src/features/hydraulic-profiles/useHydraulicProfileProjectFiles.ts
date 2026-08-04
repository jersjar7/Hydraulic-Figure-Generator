import type { IngestNotice } from '../../core/types'
import { browserProjectFilePort } from '../../infrastructure/browser/browserProjectFilePort'
import {
  parseHydraulicProfileProject,
  serializeHydraulicProfileProject,
  type HydraulicProfileProjectState,
} from './hydraulicProfileProjectFile'

type Options = {
  snapshot: HydraulicProfileProjectState
  appendNotices(notices: IngestNotice[]): void
}

export function useHydraulicProfileProjectFiles({ snapshot, appendNotices }: Options) {
  const saveProject = () => browserProjectFilePort.downloadText({
    contents: serializeHydraulicProfileProject(snapshot),
    fileName: 'Hydraulic_Profiles_Sections.hydfig',
    mimeType: 'application/json',
  })
  const loadProjectFile = async (file: File) => {
    try {
      return parseHydraulicProfileProject(await browserProjectFilePort.readText(file))
    } catch (error) {
      appendNotices([{ level: 'error', text: `Project load failed: ${error instanceof Error ? error.message : String(error)}` }])
      return null
    }
  }
  return { saveProject, loadProjectFile }
}
