import { browserProjectFilePort } from '../../infrastructure/browser/browserProjectFilePort'
import type { useReportAssembly } from './useReportAssembly'
import {
  parseReportAssembly,
  serializeReportAssembly,
} from './reportAssemblyProjectFile'

type Options = {
  reportAssembly: ReturnType<typeof useReportAssembly>
  onStatus(status: string): void
}

export function useReportAssemblyProjectFiles({
  reportAssembly,
  onStatus,
}: Options) {
  const save = () => browserProjectFilePort.downloadText({
    contents: serializeReportAssembly(reportAssembly.document),
    fileName: 'Hydraulic_Figure_Export_Collection.hydreport',
    mimeType: 'application/json',
  })
  const load = async (file: File) => {
    try {
      reportAssembly.load(parseReportAssembly(await browserProjectFilePort.readText(file)))
      onStatus('Export Collection loaded.')
      return true
    } catch (error) {
      onStatus(`Load failed: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }
  return { save, load }
}
