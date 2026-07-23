import { readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { File } from 'node:buffer'
import { tmpdir } from 'node:os'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { HydraulicEngine } from '../src/core/hydraulicEngine'
import {
  canvasPointToMap,
  DEFAULT_ELEMENT_POSITIONS,
  formatHydraulicResultLabel,
  hitTestAnnotation,
  mapPointToCanvas,
  renderWseDifferenceMap,
  sampleHydraulicResult,
} from '../src/core/mapRenderer'
import { readShapefileOverlays } from '../src/core/shapefile'
import type {
  FigureSettings,
  MapAnnotation,
} from '../src/core/types'

const dataDirectory = process.env.HFG_SITE6_DATA
if (!dataDirectory) {
  throw new Error('Set HFG_SITE6_DATA to the Site 6 H5 file directory.')
}
const testBasemap = process.env.HFG_TEST_BASEMAP === '1'
if (testBasemap) {
  globalThis.createImageBitmap = (async (source: ImageBitmapSource) => {
    if (!(source instanceof Blob)) {
      throw new Error('The basemap test expected a Blob image source.')
    }
    const image = await loadImage(Buffer.from(await source.arrayBuffer()))
    return Object.assign(image, { close() {} }) as unknown as ImageBitmap
  }) as typeof createImageBitmap
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
  basemapOpacity: testBasemap ? 0.72 : 0,
  rotation: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  elementPositions: structuredClone(DEFAULT_ELEMENT_POSITIONS),
}
const resultIndex = Array.from(scene.diff).findIndex(
  (value) => Number.isFinite(value) && value > -900,
)
if (resultIndex < 0) {
  throw new Error('No valid mesh node was available for annotation sampling.')
}
const resultPoint = {
  x: scene.projected.mx[resultIndex],
  y: scene.projected.my[resultIndex],
}
const hydraulicSample = sampleHydraulicResult(
  scene,
  engine.commonBounds(),
  renderSettings,
  resultPoint,
)
if (!hydraulicSample) {
  throw new Error('The automatic result annotation could not sample Site 6.')
}
const annotationOffset =
  Math.max(
    scene.projected.bbox.x1 - scene.projected.bbox.x0,
    scene.projected.bbox.y1 - scene.projected.bbox.y0,
  ) * 0.06
const annotationStyle = {
  color: '#b42318',
  fillColor: '#ffffff',
  lineWidth: 3,
  fontSize: 20,
  dashed: false,
  background: true,
}
const annotations: MapAnnotation[] = [
  {
    id: 'text',
    kind: 'text',
    points: [{ x: resultPoint.x, y: resultPoint.y + annotationOffset }],
    text: 'Site 6',
    ...annotationStyle,
  },
  {
    id: 'leader',
    kind: 'leader',
    points: [
      resultPoint,
      {
        x: resultPoint.x + annotationOffset,
        y: resultPoint.y + annotationOffset,
      },
    ],
    text: 'Hydraulic structure',
    ...annotationStyle,
  },
  {
    id: 'arrow',
    kind: 'arrow',
    points: [
      { x: resultPoint.x - annotationOffset, y: resultPoint.y },
      resultPoint,
    ],
    text: '',
    ...annotationStyle,
  },
  {
    id: 'line',
    kind: 'line',
    points: [
      {
        x: resultPoint.x - annotationOffset,
        y: resultPoint.y - annotationOffset,
      },
      {
        x: resultPoint.x + annotationOffset,
        y: resultPoint.y - annotationOffset,
      },
    ],
    text: '',
    ...annotationStyle,
    dashed: true,
  },
  {
    id: 'marker',
    kind: 'marker',
    points: [{ x: resultPoint.x - annotationOffset, y: resultPoint.y }],
    text: '1',
    ...annotationStyle,
  },
  {
    id: 'result',
    kind: 'result',
    points: [
      resultPoint,
      {
        x: resultPoint.x + annotationOffset,
        y: resultPoint.y - annotationOffset,
      },
    ],
    text: formatHydraulicResultLabel('summary', hydraulicSample),
    resultField: 'summary',
    ...annotationStyle,
  },
]
const textScreenPoint = mapPointToCanvas(
  annotations[0].points[0],
  engine.commonBounds(),
  renderSettings,
)
const roundTripPoint = canvasPointToMap(
  textScreenPoint.x,
  textScreenPoint.y,
  engine.commonBounds(),
  renderSettings,
)
const selectedAnnotationId = hitTestAnnotation(
  [annotations[0]],
  engine.commonBounds(),
  renderSettings,
  textScreenPoint.x,
  textScreenPoint.y,
)
if (
  selectedAnnotationId !== 'text' ||
  Math.hypot(
    roundTripPoint.x - annotations[0].points[0].x,
    roundTripPoint.y - annotations[0].points[0].y,
  ) > 1e-6
) {
  throw new Error(
    `Annotation selection or map-coordinate anchoring failed (${selectedAnnotationId}, ${Math.hypot(
      roundTripPoint.x - annotations[0].points[0].x,
      roundTripPoint.y - annotations[0].points[0].y,
    )}).`,
  )
}
const canvas = createCanvas(1650, 1275)
await renderWseDifferenceMap(
  canvas as unknown as HTMLCanvasElement,
  scene,
  engine.commonBounds(),
  renderSettings,
  overlayResult.overlays,
  annotations,
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
if (testBasemap && coloredPixels < 100_000) {
  throw new Error(
    `Rendered basemap appears blank (${coloredPixels} colored samples).`,
  )
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
        annotations: annotations.length,
        selectedAnnotationId,
        sampledResultLabel: annotations.at(-1)?.text,
        basemap: testBasemap,
      },
    },
    null,
    2,
  ),
)
