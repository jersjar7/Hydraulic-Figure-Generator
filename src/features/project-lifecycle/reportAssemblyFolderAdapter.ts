import type { ReportAssemblyDocument } from '../../core/types'
import {
  parseReportAssembly,
  serializeReportAssembly,
} from '../report-assembly/reportAssemblyProjectFile'
import { REPORT_ASSEMBLY_WORKSPACE_ID } from '../report-assembly/reportAssemblyWorkspaceId'
import type { ProjectWorkspaceFolderAdapter } from './projectWorkspaceFolderAdapter'

export const reportAssemblyFolderAdapter: ProjectWorkspaceFolderAdapter<ReportAssemblyDocument> = {
  workspaceId: REPORT_ASSEMBLY_WORKSPACE_ID,
  defaultEntry: {
    documentPath: 'workspaces/export-collection.hydreport.json',
    inputPaths: {},
  },
  fingerprint: serializeReportAssembly,
  write: async ({ storage, directory, entry, state }) => {
    await storage.writeText(
      directory,
      entry.documentPath,
      serializeReportAssembly(state),
    )
  },
  read: async ({ storage, directory, entry }) =>
    parseReportAssembly(await storage.readText(directory, entry.documentPath)),
}
