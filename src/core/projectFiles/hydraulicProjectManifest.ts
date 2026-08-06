export const HYDRAULIC_PROJECT_MANIFEST_FILE = 'project.hfg.json'
export const HYDRAULIC_PROJECT_SCHEMA = 'hydraulic-figure-generator-project'
export const HYDRAULIC_PROJECT_VERSION = 1

export type HydraulicProjectWorkspaceEntry = {
  documentPath: string
  inputPaths: Record<string, string>
}

export type HydraulicProjectManifest = {
  schema: typeof HYDRAULIC_PROJECT_SCHEMA
  version: typeof HYDRAULIC_PROJECT_VERSION
  projectName: string
  createdAt: string
  updatedAt: string
  activeWorkspaceId: string
  workspaces: Record<string, HydraulicProjectWorkspaceEntry>
}

function isProjectPath(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false
  const normalized = value.replaceAll('\\', '/')
  return !normalized.startsWith('/')
    && !normalized.split('/').some((part) => part === '..' || part === '')
}

function isWorkspaceEntry(value: unknown): value is HydraulicProjectWorkspaceEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<HydraulicProjectWorkspaceEntry>
  if (!isProjectPath(entry.documentPath)) return false
  if (!entry.inputPaths || typeof entry.inputPaths !== 'object') return false
  return Object.values(entry.inputPaths).every(isProjectPath)
}

export function serializeHydraulicProjectManifest(
  manifest: HydraulicProjectManifest,
) {
  return JSON.stringify(manifest, null, 2)
}

export function parseHydraulicProjectManifest(text: string): HydraulicProjectManifest {
  const parsed = JSON.parse(text) as Partial<HydraulicProjectManifest>
  if (parsed.schema !== HYDRAULIC_PROJECT_SCHEMA) {
    throw new Error('This folder is not a Hydraulic Figure Generator project.')
  }
  if (parsed.version !== HYDRAULIC_PROJECT_VERSION) {
    throw new Error(`Project version ${String(parsed.version)} is not supported.`)
  }
  if (
    typeof parsed.projectName !== 'string'
    || !parsed.projectName.trim()
    || typeof parsed.createdAt !== 'string'
    || typeof parsed.updatedAt !== 'string'
    || typeof parsed.activeWorkspaceId !== 'string'
    || !parsed.workspaces
    || typeof parsed.workspaces !== 'object'
    || !Object.values(parsed.workspaces).every(isWorkspaceEntry)
  ) {
    throw new Error('The project manifest is malformed.')
  }
  return parsed as HydraulicProjectManifest
}
