import {
  createHydraulicFigureProject,
  parseHydraulicFigureProject,
  type HydraulicFigureProject,
} from '../core/projectFile'
import type { ProjectFilePort } from './ports/fileGateways'

const PROJECT_FILE_NAME = 'Hydraulic_Figure_Project.hydfig'

export type HydraulicProjectSnapshot = Omit<
  HydraulicFigureProject,
  'version' | 'figure'
>

export function saveHydraulicProject(
  snapshot: HydraulicProjectSnapshot,
  filePort: ProjectFilePort,
) {
  const project = createHydraulicFigureProject(snapshot)
  filePort.downloadText({
    contents: JSON.stringify(project, null, 2),
    fileName: PROJECT_FILE_NAME,
    mimeType: 'application/json',
  })
}

export async function loadHydraulicProject(
  file: File,
  filePort: ProjectFilePort,
) {
  return parseHydraulicFigureProject(await filePort.readText(file))
}
