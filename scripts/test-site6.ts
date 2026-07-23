import { access, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { File } from 'node:buffer'
import { tmpdir } from 'node:os'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { cloneDefaultElementStyles } from '../src/core/figureElements'
import { HydraulicEngine } from '../src/core/hydraulicEngine'
import {
  canvasPointToMap,
  DEFAULT_ELEMENT_POSITIONS,
  formatHydraulicResultLabel,
  hitTestAnnotation,
  mapPointToCanvas,
  moveAnnotationPoints,
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

async function availableFileName(candidates: string[]) {
  for (const candidate of candidates) {
    try {
      await access(join(dataDirectory, candidate))
      return candidate
    } catch {
      // Try the next supported Site 6 filename.
    }
  }
  throw new Error(`None of these files were found: ${candidates.join(', ')}`)
}

const fileNames = await Promise.all([
  availableFileName(['Existing_Datasets.h5', 'EX_datasets.h5']),
  availableFileName(['Existing_Geometry.h5', 'EX_geometry.h5']),
  availableFileName(['Proposed_Datasets.h5', 'PR_datasets.h5']),
  availableFileName(['Proposed_Geometry.h5', 'PR_geometry.h5']),
])

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

const scene = engine.buildWseDifference(existingIndex, proposedIndex, 0)
const validProposedWetNodes = Array.from(scene.proposedWseWet).filter(
  (value) => Number.isFinite(value) && value > -900,
).length
const overlayPath = join(
  dataDirectory,
  await availableFileName(['Proposed_CL.zip', 'CL.zip']),
)
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
  validProposedWetNodes <= 0 ||
  overlayFeatureCount <= 0
) {
  throw new Error(
    'The WSE comparison, Proposed wet surface, or centerline overlay is empty.',
  )
}

const renderSettings: FigureSettings = {
  orientation: 'landscape',
  dryDepth: 0,
  differenceOutlineColor: '#111111',
  showDifferenceOutlines: true,
  showWetDry: true,
  showOverlays: true,
  showTitle: true,
  showLegend: true,
  showNorth: true,
  showScale: true,
  showWetDryKey: true,
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
  elementStyles: cloneDefaultElementStyles(),
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
const selectedAnnotationHit = hitTestAnnotation(
  [annotations[0]],
  engine.commonBounds(),
  renderSettings,
  textScreenPoint.x,
  textScreenPoint.y,
)
const leaderTargetScreenPoint = mapPointToCanvas(
  annotations[1].points[0],
  engine.commonBounds(),
  renderSettings,
)
const leaderLabelScreenPoint = mapPointToCanvas(
  annotations[1].points[1],
  engine.commonBounds(),
  renderSettings,
)
const leaderTargetHit = hitTestAnnotation(
  [annotations[1]],
  engine.commonBounds(),
  renderSettings,
  leaderTargetScreenPoint.x,
  leaderTargetScreenPoint.y,
)
const leaderLabelHit = hitTestAnnotation(
  [annotations[1]],
  engine.commonBounds(),
  renderSettings,
  leaderLabelScreenPoint.x,
  leaderLabelScreenPoint.y,
)
const leaderLabelMoved = moveAnnotationPoints(
  annotations[1],
  'body',
  annotations[1].points,
  25,
  -10,
)
const leaderTargetMoved = moveAnnotationPoints(
  annotations[1],
  'start',
  annotations[1].points,
  -15,
  20,
)
const leaderWholeMoved = moveAnnotationPoints(
  annotations[1],
  'segment',
  annotations[1].points,
  8,
  12,
)
if (
  selectedAnnotationHit?.id !== 'text' ||
  selectedAnnotationHit.part !== 'body' ||
  leaderTargetHit?.id !== 'leader' ||
  leaderTargetHit.part !== 'start' ||
  leaderLabelHit?.id !== 'leader' ||
  leaderLabelHit.part !== 'body' ||
  leaderLabelMoved[0].x !== annotations[1].points[0].x ||
  leaderLabelMoved[1].x !== annotations[1].points[1].x + 25 ||
  leaderTargetMoved[0].y !== annotations[1].points[0].y + 20 ||
  leaderTargetMoved[1].y !== annotations[1].points[1].y ||
  leaderWholeMoved.some(
    (point, index) =>
      point.x !== annotations[1].points[index].x + 8 ||
      point.y !== annotations[1].points[index].y + 12,
  ) ||
  Math.hypot(
    roundTripPoint.x - annotations[0].points[0].x,
    roundTripPoint.y - annotations[0].points[0].y,
  ) > 1e-6
) {
  throw new Error(
    `Annotation selection or map-coordinate anchoring failed (${JSON.stringify({
      selectedAnnotationHit,
      leaderTargetHit,
      leaderLabelHit,
    })}, ${Math.hypot(
      roundTripPoint.x - annotations[0].points[0].x,
      roundTripPoint.y - annotations[0].points[0].y,
    )}).`,
  )
}
const canvas = createCanvas(1650, 1275)
const landscapeElementBounds = await renderWseDifferenceMap(
  canvas as unknown as HTMLCanvasElement,
  scene,
  engine.commonBounds(),
  renderSettings,
  overlayResult.overlays,
  annotations,
  'leader',
  'title',
)
if (
  landscapeElementBounds.length !== 5 ||
  landscapeElementBounds.some(
    (bounds) =>
      bounds.x < 0 ||
      bounds.y < 0 ||
      bounds.x + bounds.width > canvas.width ||
      bounds.y + bounds.height > canvas.height,
  )
) {
  throw new Error(
    `Landscape figure elements are missing or outside the frame: ${JSON.stringify(landscapeElementBounds)}`,
  )
}
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

const outlineTestSettings: FigureSettings = {
  ...renderSettings,
  basemapOpacity: 0,
  showWetDry: false,
  showOverlays: false,
  showTitle: false,
  showLegend: false,
  showNorth: false,
  showScale: false,
}
const outlineCanvas = createCanvas(1650, 1275)
const noOutlineCanvas = createCanvas(1650, 1275)
await Promise.all([
  renderWseDifferenceMap(
    outlineCanvas as unknown as HTMLCanvasElement,
    scene,
    engine.commonBounds(),
    outlineTestSettings,
    [],
  ),
  renderWseDifferenceMap(
    noOutlineCanvas as unknown as HTMLCanvasElement,
    scene,
    engine.commonBounds(),
    { ...outlineTestSettings, showDifferenceOutlines: false },
    [],
  ),
])
const outlinePixels = outlineCanvas
  .getContext('2d')
  .getImageData(0, 0, outlineCanvas.width, outlineCanvas.height).data
const noOutlinePixels = noOutlineCanvas
  .getContext('2d')
  .getImageData(0, 0, noOutlineCanvas.width, noOutlineCanvas.height).data
let differenceOutlinePixels = 0
for (let index = 0; index < outlinePixels.length; index += 4) {
  const outlinedBrightness =
    outlinePixels[index] + outlinePixels[index + 1] + outlinePixels[index + 2]
  const plainBrightness =
    noOutlinePixels[index] +
    noOutlinePixels[index + 1] +
    noOutlinePixels[index + 2]
  if (outlinedBrightness < 240 && plainBrightness - outlinedBrightness > 90) {
    differenceOutlinePixels += 1
  }
}
if (differenceOutlinePixels < 1_000) {
  throw new Error(
    `WSE-difference class outlines appear missing (${differenceOutlinePixels} changed pixels).`,
  )
}

const outputPath =
  process.env.HFG_TEST_OUTPUT || join(tmpdir(), 'hydraulic-site6-render.png')
await writeFile(outputPath, canvas.toBuffer('image/png'))

const portraitSettings: FigureSettings = {
  ...renderSettings,
  orientation: 'portrait',
  elementPositions: structuredClone(DEFAULT_ELEMENT_POSITIONS),
  elementStyles: cloneDefaultElementStyles(),
}
portraitSettings.elementStyles.title.fontSize = 34
portraitSettings.elementStyles.title.maxWidth = 760
portraitSettings.elementStyles.diffLegend.orientation = 'horizontal'
portraitSettings.elementStyles.diffLegend.decimalPlaces = 2
portraitSettings.elementStyles.wetDry.orientation = 'horizontal'
portraitSettings.elementStyles.north.style = 'compass'
portraitSettings.elementStyles.north.size = 104
portraitSettings.elementStyles.scale.units = 'm'
portraitSettings.elementStyles.scale.divisions = 5
portraitSettings.elementStyles.scale.style = 'ticks'
const portraitCanvas = createCanvas(1275, 1650)
const portraitElementBounds = await renderWseDifferenceMap(
  portraitCanvas as unknown as HTMLCanvasElement,
  scene,
  engine.commonBounds(),
  portraitSettings,
  overlayResult.overlays,
  annotations,
)
if (
  portraitElementBounds.length !== 5 ||
  portraitElementBounds.some(
    (bounds) =>
      bounds.x < 0 ||
      bounds.y < 0 ||
      bounds.x + bounds.width > portraitCanvas.width ||
      bounds.y + bounds.height > portraitCanvas.height,
  )
) {
  throw new Error(
    `Portrait figure elements are missing or outside the frame: ${JSON.stringify(portraitElementBounds)}`,
  )
}
const portraitOutputPath =
  process.env.HFG_TEST_PORTRAIT_OUTPUT ||
  join(tmpdir(), 'hydraulic-site6-render-portrait.png')
await writeFile(portraitOutputPath, portraitCanvas.toBuffer('image/png'))

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
        validProposedWetNodes,
        automaticLegendBound: scene.maxAbs,
      },
      overlay: {
        layers: overlayResult.overlays.map((overlay) => overlay.name),
        features: overlayFeatureCount,
      },
      render: {
        outputPath,
        portraitOutputPath,
        width: canvas.width,
        height: canvas.height,
        landscapeElements: landscapeElementBounds,
        portraitElements: portraitElementBounds,
        coloredPixelSamples: coloredPixels,
        annotations: annotations.length,
        selectedAnnotationId: 'leader',
        sampledResultLabel: annotations.at(-1)?.text,
        basemap: testBasemap,
        differenceOutlinePixels,
      },
    },
    null,
    2,
  ),
)
