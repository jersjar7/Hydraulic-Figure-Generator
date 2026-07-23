import { readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { File } from 'node:buffer'
import { tmpdir } from 'node:os'
import { createCanvas } from '@napi-rs/canvas'
import { HydraulicEngine } from '../src/core/hydraulicEngine'
import {
  DEFAULT_ELEMENT_POSITIONS,
  renderWseDifferenceMap,
} from '../src/core/mapRenderer'
import { readShapefileOverlays } from '../src/core/shapefile'
import type { FigureSettings } from '../src/core/types'

const dataDirectory = process.env.HFG_SITE6_DATA
if (!dataDirectory) {
  throw new Error('Set HFG_SITE6_DATA to the Site 6 H5 file directory.')
}

const fileNames = [
  'Existing_Datasets.h5',
  'Existing_Geometry.h5',
  'Proposed_Datasets.h5',
  'Proposed_Geometry.h5',
]

const files = await Promise.all(
  fileNames.map(async (fileName) => {
    const path = join(dataDirectory, fileName)
    return new File([await readFile(path)], basename(path))
  }),
)

const engine = new HydraulicEngine()
const notices = await engine.ingest(files as unknown as globalThis.File[])
if (notices.some((notice) => notice.level === 'error')) {
  throw new Error(notices.map((notice) => notice.text).join('\n'))
}
if (!engine.isReady()) {
  throw new Error('The engine did not assemble complete Existing and Proposed conditions.')
}

const existingRuns = engine.runOptions('EX')
const proposedRuns = engine.runOptions('PR')
const existingIndex = existingRuns.findIndex((selection) =>
  /100Y[RY]/i.test(selection.run.name) && !/2080/i.test(selection.run.name),
)
const proposedIndex = proposedRuns.findIndex((selection) =>
  /100Y[RY]/i.test(selection.run.name) && !/2080/i.test(selection.run.name),
)
if (existingIndex < 0 || proposedIndex < 0) {
  throw new Error('A 100-year run was not found in both conditions.')
}

const scene = engine.buildWseDifference(existingIndex, proposedIndex, 0.05)
const validProposedContourNodes = Array.from(scene.proposedWseWet).filter(
  (value) => Number.isFinite(value) && value > -900,
).length
const overlayPath = join(dataDirectory, 'Proposed_CL.zip')
const overlayFile = new File([await readFile(overlayPath)], basename(overlayPath))
const overlayResult = await readShapefileOverlays(
  [overlayFile] as unknown as globalThis.File[],
  0,
)
const overlayFeatureCount = overlayResult.overlays.reduce(
  (total, overlay) => total + overlay.geojson.features.length,
  0,
)

if (
  scene.validDifferenceNodes <= 0 ||
  validProposedContourNodes <= 0 ||
  overlayFeatureCount <= 0
) {
  throw new Error(
    'The WSE comparison, proposed contour surface, or centerline overlay is empty.',
  )
}

const renderSettings: FigureSettings = {
  orientation: 'landscape',
  dryDepth: 0.05,
  contourInterval: 0.5,
  contourColor: '#d92727',
  showContours: true,
  showWetDry: true,
  showOverlays: true,
  showTitle: true,
  showLegend: true,
  showNorth: true,
  showScale: true,
  titleTemplate: '{type} - {existing} vs {proposed}',
  legendBound: null,
  legendInterval: null,
  legendFontSize: 19,
  newlyWetColor: '#2cc88b',
  newlyDryColor: '#e97768',
  basemapOpacity: 0,
  rotation: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  elementPositions: structuredClone(DEFAULT_ELEMENT_POSITIONS),
}
const canvas = createCanvas(1650, 1275)
await renderWseDifferenceMap(
  canvas as unknown as HTMLCanvasElement,
  scene,
  engine.commonBounds(),
  renderSettings,
  overlayResult.overlays,
)
const imageData = canvas
  .getContext('2d')
  .getImageData(0, 0, canvas.width, canvas.height).data
let coloredPixels = 0
for (let index = 0; index < imageData.length; index += 16) {
  const red = imageData[index]
  const green = imageData[index + 1]
  const blue = imageData[index + 2]
  if (Math.max(red, green, blue) - Math.min(red, green, blue) > 18) {
    coloredPixels += 1
  }
}
if (coloredPixels < 10_000) {
  throw new Error(`Rendered map appears blank (${coloredPixels} colored samples).`)
}
const outputPath =
  process.env.HFG_TEST_OUTPUT || join(tmpdir(), 'hydraulic-site6-render.png')
await writeFile(outputPath, canvas.toBuffer('image/png'))

console.log(
  JSON.stringify(
    {
      notices,
      existing: {
        nodes: scene.projected.N,
        runs: existingRuns.map((selection) => selection.run.name),
      },
      proposed: {
        nodes: scene.proposedProjected.N,
        runs: proposedRuns.map((selection) => selection.run.name),
      },
      comparison: {
        existingRun: scene.existing.run.name,
        proposedRun: scene.proposed.run.name,
        validDifferenceNodes: scene.validDifferenceNodes,
        validProposedContourNodes,
        automaticLegendBound: scene.maxAbs,
      },
      overlay: {
        layers: overlayResult.overlays.map((overlay) => overlay.name),
        features: overlayFeatureCount,
      },
      render: {
        outputPath,
        width: canvas.width,
        height: canvas.height,
        coloredPixelSamples: coloredPixels,
      },
    },
    null,
    2,
  ),
)
