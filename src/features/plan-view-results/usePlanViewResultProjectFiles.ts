import type { IngestNotice } from '../../core/types'
import { browserProjectFilePort } from '../../infrastructure/browser/browserProjectFilePort'
import {
  parsePlanViewResultProject,
  serializePlanViewResultProject,
  type PlanViewResultProjectState,
} from './planViewResultProjectFile'

type Options = {
  snapshot: PlanViewResultProjectState
  appendNotices(notices: IngestNotice[]): void
}

export function usePlanViewResultProjectFiles({
  snapshot,
  appendNotices,
}: Options) {
  const saveProject = () => {
    browserProjectFilePort.downloadText({
      contents: serializePlanViewResultProject(snapshot),
      fileName: 'Plan_View_Hydraulic_Results.hydfig',
      mimeType: 'application/json',
    })
  }

  const loadProjectFile = async (file: File) => {
    try {
      return parsePlanViewResultProject(
        await browserProjectFilePort.readText(file),
      )
    } catch (error) {
      appendNotices([{
        level: 'error',
        text: `Project load failed: ${error instanceof Error ? error.message : String(error)}`,
      }])
      return null
    }
  }

  return { saveProject, loadProjectFile }
}
