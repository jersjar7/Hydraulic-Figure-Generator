import { File } from 'node:buffer'
import { access, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { HydraulicEngine, runDisplayName } from '../src/core/hydraulicEngine'

const dataDirectory = process.env.HFG_NATURAL_DATA
if (!dataDirectory) {
  throw new Error(
    'Set HFG_NATURAL_DATA to a directory containing Existing and Natural H5 pairs.',
  )
}

async function availableFileName(candidates: string[]) {
  for (const candidate of candidates) {
    try {
      await access(join(dataDirectory, candidate))
      return candidate
    } catch {
      // Try the next supported export name.
    }
  }
  throw new Error(`None of these files were found: ${candidates.join(', ')}`)
}

const fileNames = await Promise.all([
  availableFileName([
    'EX-datasets.h5',
    'EX_Datasets.h5',
    'Existing Datasets.h5',
  ]),
  availableFileName([
    'EX-Geo.h5',
    'EX_Geometry.h5',
    'Existing Geometry.h5',
  ]),
  availableFileName([
    'Na-datasets.h5',
    'Natural_Datasets.h5',
    'Natural Datasets.h5',
  ]),
  availableFileName([
    'Na-geo.h5',
    'Natural_Geometry.h5',
    'Natural Geometry.h5',
  ]),
])
const files = await Promise.all(
  fileNames.map(async (fileName) => {
    const path = join(dataDirectory, fileName)
    return new File([await readFile(path)], basename(path))
  }),
)

const engine = new HydraulicEngine()
const notices = await engine.ingest(files as unknown as globalThis.File[])
const errors = notices.filter((notice) => notice.level === 'error')
if (errors.length > 0) {
  throw new Error(errors.map((notice) => notice.text).join('\n'))
}
if (!engine.isReady('EX', 'NA')) {
  throw new Error('Existing and Natural did not assemble into complete scenarios.')
}

const existingRuns = engine.runOptions('EX')
const naturalRuns = engine.runOptions('NA')
const normalizedEvent = (name: string) =>
  runDisplayName(name)
    .replace(/\b(existing|natural|ex|na)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
const naturalIndex = naturalRuns.findIndex((natural) =>
  existingRuns.some(
    (existing) =>
      normalizedEvent(existing.run.name) === normalizedEvent(natural.run.name),
  ),
)
const comparisonIndex = naturalIndex >= 0 ? naturalIndex : 0
const existingIndex = Math.max(
  0,
  existingRuns.findIndex(
    (existing) =>
      normalizedEvent(existing.run.name) ===
      normalizedEvent(naturalRuns[comparisonIndex].run.name),
  ),
)
const scene = engine.buildWseDifference(
  'EX',
  existingIndex,
  'NA',
  comparisonIndex,
  0,
)
if (scene.validDifferenceNodes <= 0) {
  throw new Error('Existing and Natural have no comparable valid WSE nodes.')
}

console.log(
  JSON.stringify(
    {
      notices,
      scenarios: engine.scenarios().map((scenario) => ({
        id: scenario.key,
        label: scenario.label,
        nodes: scenario.projected?.N,
        runs: scenario.datasets?.runs.length,
      })),
      comparison: {
        baseline: runDisplayName(scene.existing.run.name),
        comparison: runDisplayName(scene.proposed.run.name),
        validDifferenceNodes: scene.validDifferenceNodes,
        automaticLegendBound: scene.maxAbs,
      },
    },
    null,
    2,
  ),
)
