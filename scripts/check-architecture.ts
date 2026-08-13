import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  evaluateArchitecture,
  type ArchitectureSourceFile,
} from './architecturePolicy'

const root = process.cwd()
const sourceRoot = path.join(root, 'src')
const sourceExtensions = new Set(['.ts', '.tsx'])

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(fullPath)
    return sourceExtensions.has(path.extname(entry.name)) ? [fullPath] : []
  }))
  return files.flat()
}

const files: ArchitectureSourceFile[] = await Promise.all(
  (await sourceFiles(sourceRoot)).map(async (file) => ({
    relativeFile: path.relative(root, file),
    source: await readFile(file, 'utf8'),
  })),
)
const violations = evaluateArchitecture(files)
if (violations.length > 0) {
  console.error('Architecture checks failed:\n')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exitCode = 1
} else {
  console.log(
    'Architecture checks passed: dependency direction, React isolation, workspace ownership, and composition ceilings.',
  )
}
