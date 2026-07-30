import type { IngestNotice } from '../../core/types'
import { browserProjectFilePort } from '../../infrastructure/browser/browserProjectFilePort'
import {
  parseCrossSectionProject,
  serializeCrossSectionProject,
  type CrossSectionProjectState,
} from './crossSectionProjectFile'

type Options = {
  snapshot: CrossSectionProjectState
  appendNotices: (notices: IngestNotice[]) => void
}

export function useCrossSectionProjectFiles({
  snapshot,
  appendNotices,
}: Options) {
  const saveProject = () => {
    browserProjectFilePort.downloadText({
      contents: serializeCrossSectionProject(snapshot),
      fileName: 'FRA_Cross_Section.hydfig',
      mimeType: 'application/json',
    })
  }

  const loadProjectFile = async (file: File) => {
    try {
      return parseCrossSectionProject(
        await browserProjectFilePort.readText(file),
      )
    } catch (error) {
      appendNotices([
        {
          level: 'error',
          text: `Project load failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ])
      return null
    }
  }

  return { saveProject, loadProjectFile }
}
