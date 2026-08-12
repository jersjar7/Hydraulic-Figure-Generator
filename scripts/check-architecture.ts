import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const sourceRoot = path.join(root, 'src')
const sourceExtensions = new Set(['.ts', '.tsx'])
const layerRules: Record<string, Set<string>> = {
  core: new Set(['core']),
  application: new Set(['application', 'core']),
  infrastructure: new Set([
    'infrastructure',
    'application',
    'core',
  ]),
}
const maxLines = 600
const workspaceMaxLines = 500
const importPattern =
  /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return sourceFiles(fullPath)
      return sourceExtensions.has(path.extname(entry.name))
        ? [fullPath]
        : []
    }),
  )
  return files.flat()
}

function sourceLayer(file: string) {
  return path.relative(sourceRoot, file).split(path.sep)[0]
}

function importedLayer(file: string, specifier: string) {
  if (!specifier.startsWith('.')) return null
  const resolved = path.resolve(path.dirname(file), specifier)
  const relative = path.relative(sourceRoot, resolved)
  if (relative.startsWith('..')) return null
  return relative.split(path.sep)[0]
}

const violations: string[] = []
for (const file of await sourceFiles(sourceRoot)) {
  const source = await readFile(file, 'utf8')
  const relativeFile = path.relative(root, file).replaceAll('\\', '/')
  const lineCount = source.split(/\r?\n/).length
  if (lineCount > maxLines) {
    violations.push(
      `${relativeFile}: ${lineCount} lines exceeds the ${maxLines}-line composition ceiling`,
    )
  }
  if (file.endsWith('Workspace.tsx') && lineCount > workspaceMaxLines) {
    violations.push(
      `${relativeFile}: ${lineCount} lines exceeds the ${workspaceMaxLines}-line workspace composition ceiling`,
    )
  }

  const layer = sourceLayer(file)
  if (
    (layer === 'core' || layer === 'application') &&
    /from\s+['"](?:react|react-dom)(?:\/[^'"]*)?['"]/.test(source)
  ) {
    violations.push(
      `${relativeFile}: ${layer} must remain independent of React`,
    )
  }

  if (
    file.endsWith('Workspace.tsx') &&
    /from\s+['"][^'"]*infrastructure(?:\/|['"])/.test(source)
  ) {
    violations.push(
      `${relativeFile}: workspaces must call feature/application adapters instead of infrastructure directly`,
    )
  }

  if (
    file.endsWith('Workspace.tsx') &&
    /from\s+['"][^'"]*(?:FigurePicker|ExportCollectionButton)['"]/.test(source)
  ) {
    violations.push(
      `${relativeFile}: global header navigation belongs to App.tsx, not a figure workspace`,
    )
  }

  const allowedLayers = layerRules[layer]
  if (!allowedLayers) continue
  for (const match of source.matchAll(importPattern)) {
    const dependencyLayer = importedLayer(file, match[1])
    if (dependencyLayer && !allowedLayers.has(dependencyLayer)) {
      violations.push(
        `${relativeFile}: ${layer} cannot import from ${dependencyLayer} (${match[1]})`,
      )
    }
  }
}

if (violations.length > 0) {
  console.error('Architecture checks failed:\n')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exitCode = 1
} else {
  console.log(
    'Architecture checks passed: dependency direction, React isolation, workspace boundaries, and file-size ceilings.',
  )
}
