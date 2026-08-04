import {
  loadHydraulicProject,
  saveHydraulicProject,
} from '../../application/hydraulicProjectFiles'
import type { IngestNotice } from '../../core/types'
import { browserProjectFilePort } from '../../infrastructure/browser/browserProjectFilePort'
import type { HydraulicProjectDocument } from '../project-document/hydraulicProjectDocument'
import type { WseFigureDocument } from './wseFigureDocument'
import {
  createWseProjectSnapshot,
  hydrateWseProject,
  type CreateWseProjectSnapshotOptions,
  type WseProjectState,
} from './wseProjectDocument'

type Options = {
  snapshot: CreateWseProjectSnapshotOptions
  currentFigure: WseFigureDocument
  currentProject: HydraulicProjectDocument
  appendNotices: (notices: IngestNotice[]) => void
}

export function createWseProjectFileActions({
  snapshot,
  currentFigure,
  currentProject,
  appendNotices,
}: Options) {
  const saveProject = () => {
    saveHydraulicProject(
      createWseProjectSnapshot(snapshot),
      browserProjectFilePort,
    )
  }

  const loadProjectFile = async (
    file: File,
  ): Promise<WseProjectState | null> => {
    try {
      const project = await loadHydraulicProject(
        file,
        browserProjectFilePort,
      )
      return hydrateWseProject(project, currentFigure, currentProject)
    } catch (error) {
      appendNotices([
        {
          level: 'error',
          text: `Project could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
        },
      ])
      return null
    }
  }

  return { saveProject, loadProjectFile }
}
