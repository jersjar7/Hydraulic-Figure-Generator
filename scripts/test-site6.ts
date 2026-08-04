import { access, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { File } from 'node:buffer'
import { tmpdir } from 'node:os'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { cloneDefaultElementStyles } from '../src/core/figureElements'
import {
  extractCenterlineCandidates,
  formatStation,
  generateCenterlineStationTicks,
  stationAssessmentLines,
} from '../src/core/centerlineStationing'
import { createDefaultFigureSettings } from '../src/core/defaults'
import {
  findWseDifferenceExtrema,
  formatWseExtremumLabel,
  HydraulicEngine,
} from '../src/core/hydraulicEngine'
import {
  canvasPointToMap,
  DEFAULT_ELEMENT_POSITIONS,
  duplicateAnnotation,
  formatHydraulicResultLabel,
  hitTestAnnotation,
  hitTestAssessmentCallout,
  hitTestStationLabel,
  mapPointToCanvas,
  moveAnnotationPoints,
  renderWseDifferenceMap,
  sampleHydraulicResult,
  stationLabelPosition,
} from '../src/core/mapRenderer'
import { renderPlanViewResultDocument } from '../src/core/map/planViewResultRenderer'
import { readShapefileOverlays } from '../src/core/shapefile'
import type {
  AssessmentMapLayer,
  FigureSettings,
  MapAnnotation,
  PlanViewGeometryOutputId,
} from '../src/core/types'
import {
  PLAN_VIEW_MESH_ELEMENTS_ID,
  PLAN_VIEW_TOPOGRAPHY_ID,
  PLAN_VIEW_TOPOGRAPHY_MESH_ID,
} from '../src/core/types'
import { renderCrossSectionDocument } from '../src/features/cross-section/crossSectionRenderer'
import { createDefaultCrossSectionSettings } from '../src/features/cross-section/crossSectionSettings'
import { createDefaultPlanViewResultSettings } from '../src/features/plan-view-results/planViewResultSettings'
import { expandPlanViewFigureSet } from '../src/features/plan-view-results/planViewFigureSet'

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
  availableFileName([
    'Existing_Datasets.h5',
    'Existing Datasets.h5',
    'EX_datasets.h5',
  ]),
  availableFileName([
    'Existing_Geometry.h5',
    'Existing Geometry.h5',
    'EX_geometry.h5',
  ]),
  availableFileName([
    'Proposed_Datasets.h5',
    'Proposed Datasets.h5',
    'PR_datasets.h5',
  ]),
  availableFileName([
    'Proposed_Geometry.h5',
    'Proposed Geometry.h5',
    'PR_geometry.h5',
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
if (notices.some((notice) => notice.level === 'error')) {
  throw new Error(notices.map((notice) => notice.text).join('\n'))
}
if (!engine.isReady('EX', 'PR')) {
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

const scalarOptions = engine.scalarResultOptions('EX', existingIndex)
const expectedScalarResults = [
  /B_?Stress/i,
  /Froude/i,
  /Vel(?:ocity)?_?Mag/i,
  /Water_?Depth/i,
  /Water_?Elev|WSE/i,
]
const scalarScenes = expectedScalarResults.map((pattern) => {
  const option = scalarOptions.find(({ paramName }) => pattern.test(paramName))
  if (!option) {
    throw new Error(`Site 6 is missing a scalar result matching ${pattern}.`)
  }
  const result = engine.buildPlanViewResult('EX', existingIndex, option.paramName)
  if (result.validNodes <= 0 || result.autoMax <= result.autoMin) {
    throw new Error(`${option.label} produced an invalid plan-view result range.`)
  }
  return result
})
const geometryOutputIds: PlanViewGeometryOutputId[] = [
  PLAN_VIEW_TOPOGRAPHY_ID,
  PLAN_VIEW_MESH_ELEMENTS_ID,
  PLAN_VIEW_TOPOGRAPHY_MESH_ID,
]
const geometryScenes = geometryOutputIds.map((outputId) =>
  engine.buildPlanViewResult('EX', undefined, outputId),
)
const figureSetScenarioIds = ['EX', 'PR']
const figureSetItems = expandPlanViewFigureSet(
  engine,
  {
    scenarioIds: figureSetScenarioIds,
    runIndicesByScenario: Object.fromEntries(
      figureSetScenarioIds.map((scenarioId) => [
        scenarioId,
        engine.runOptions(scenarioId).map((_, index) => index),
      ]),
    ),
    resultParametersByScenario: Object.fromEntries(
      figureSetScenarioIds.map((scenarioId) => [
        scenarioId,
        [...new Set([
          ...geometryOutputIds,
          ...engine.runOptions(scenarioId).flatMap((_, runIndex) =>
            engine.scalarResultOptions(scenarioId, runIndex).map(
              (result) => result.paramName,
            ),
          ),
        ])],
      ]),
    ),
  },
  {
    ...createDefaultPlanViewResultSettings(),
    basemapOpacity: 0,
  },
)
if (figureSetItems.length !== 46) {
  throw new Error(
    `Expected 46 valid Site 6 plan-view figures, found ${figureSetItems.length}.`,
  )
}
const depthScene = scalarScenes.find((result) =>
  /Water_?Depth/i.test(result.result.paramName),
)!
const planViewCanvas = createCanvas(1650, 1275)
await renderPlanViewResultDocument(
  planViewCanvas as unknown as HTMLCanvasElement,
  {
    scene: depthScene,
    view: {
      bounds: engine.commonBounds(['EX']),
      settings: {
        ...createDefaultPlanViewResultSettings(),
        basemapOpacity: 0,
        showOverlays: false,
      },
    },
    layers: { overlays: [] },
    selection: {},
  },
)
const planViewPixels = planViewCanvas
  .getContext('2d')
  .getImageData(0, 0, planViewCanvas.width, planViewCanvas.height).data
let planViewColoredSamples = 0
for (let index = 0; index < planViewPixels.length; index += 128) {
  const red = planViewPixels[index]
  const green = planViewPixels[index + 1]
  const blue = planViewPixels[index + 2]
  if (Math.max(red, green, blue) - Math.min(red, green, blue) > 20) {
    planViewColoredSamples += 1
  }
}
if (planViewColoredSamples < 500) {
  throw new Error(
    `Rendered Site 6 plan-view result appears blank (${planViewColoredSamples} colored samples).`,
  )
}
const planViewOutputPath =
  process.env.HFG_TEST_PLAN_VIEW_OUTPUT ||
  join(tmpdir(), 'hydraulic-site6-plan-view.png')
await writeFile(planViewOutputPath, planViewCanvas.toBuffer('image/png'))

const geometryCanvas = createCanvas(1650, 1275)
await renderPlanViewResultDocument(
  geometryCanvas as unknown as HTMLCanvasElement,
  {
    scene: geometryScenes[2],
    view: {
      bounds: engine.commonBounds(['EX']),
      settings: {
        ...createDefaultPlanViewResultSettings(),
        resultParameter: PLAN_VIEW_TOPOGRAPHY_MESH_ID,
        ramp: 'topography',
        basemapOpacity: 0,
        showOverlays: false,
        elementStyles: {
          ...createDefaultPlanViewResultSettings().elementStyles,
          diffLegend: {
            ...createDefaultPlanViewResultSettings().elementStyles.diffLegend,
            title: 'Topography',
            units: 'ft',
          },
        },
      },
    },
    layers: { overlays: [] },
    selection: {},
  },
)
const geometryOutputPath = join(
  tmpdir(),
  'hydraulic-site6-topography-mesh.png',
)
await writeFile(geometryOutputPath, geometryCanvas.toBuffer('image/png'))

const scene = engine.buildWseDifference(
  'EX',
  existingIndex,
  'PR',
  proposedIndex,
  0,
)
const assessmentLines = engine.buildWseAssessmentLines(
  'EX',
  existingIndex,
  0,
  1,
)
const halfFootAssessmentLines = engine.buildWseAssessmentLines(
  'EX',
  existingIndex,
  0,
  0.5,
)
if (
  assessmentLines.lines.length === 0 ||
  assessmentLines.levelCount === 0 ||
  assessmentLines.lines.some(
    (line) =>
      line.points.length < 2 ||
      line.lengthFeet <= 0 ||
      line.source !== 'existing-wse',
  )
) {
  throw new Error('Existing WSE assessment-line generation is empty or malformed.')
}
if (
  halfFootAssessmentLines.lines.length <= assessmentLines.lines.length ||
  halfFootAssessmentLines.levelCount <= assessmentLines.levelCount
) {
  throw new Error(
    'Half-foot assessment lines did not add Site 6 elevations and paths.',
  )
}
const extrema = findWseDifferenceExtrema(scene)
const validDifferences = Array.from(scene.diff).filter(
  (value) => Number.isFinite(value) && value > -900,
)
const expectedRise = Math.max(...validDifferences)
const expectedReduction = Math.min(...validDifferences)
if (
  !extrema.rise ||
  !extrema.reduction ||
  extrema.rise.value !== expectedRise ||
  extrema.reduction.value !== expectedReduction ||
  extrema.rise.value <= 0 ||
  extrema.reduction.value >= 0
) {
  throw new Error(
    `WSE extrema were not identified correctly: ${JSON.stringify({
      extrema,
      expectedRise,
      expectedReduction,
    })}`,
  )
}
const validProposedWetNodes = Array.from(scene.proposedWseWet).filter(
  (value) => Number.isFinite(value) && value > -900,
).length
const expectedComparison = {
  validDifferenceNodes: 2711,
  validProposedWetNodes: 3558,
  maxWseRise: 0.7870330810546875,
  maxWseReduction: -2.9294357299804688,
  assessmentLines: 33,
  assessmentLevels: 20,
  assessmentMinimumLevel: 47,
  assessmentMaximumLevel: 71,
  halfFootAssessmentLines: 60,
  halfFootAssessmentLevels: 39,
}
if (
  scene.validDifferenceNodes !== expectedComparison.validDifferenceNodes ||
  validProposedWetNodes !== expectedComparison.validProposedWetNodes ||
  Math.abs(extrema.rise.value - expectedComparison.maxWseRise) > 1e-6 ||
  Math.abs(extrema.reduction.value - expectedComparison.maxWseReduction) > 1e-6 ||
  assessmentLines.lines.length !== expectedComparison.assessmentLines ||
  assessmentLines.levelCount !== expectedComparison.assessmentLevels ||
  assessmentLines.minimumLevel !== expectedComparison.assessmentMinimumLevel ||
  assessmentLines.maximumLevel !== expectedComparison.assessmentMaximumLevel ||
  halfFootAssessmentLines.lines.length !==
    expectedComparison.halfFootAssessmentLines ||
  halfFootAssessmentLines.levelCount !==
    expectedComparison.halfFootAssessmentLevels
) {
  throw new Error(
    `Site 6 hydraulic comparison changed: ${JSON.stringify({
      actual: {
        validDifferenceNodes: scene.validDifferenceNodes,
        validProposedWetNodes,
        maxWseRise: extrema.rise.value,
        maxWseReduction: extrema.reduction.value,
        assessmentLines: assessmentLines.lines.length,
        assessmentLevels: assessmentLines.levelCount,
        assessmentMinimumLevel: assessmentLines.minimumLevel,
        assessmentMaximumLevel: assessmentLines.maximumLevel,
        halfFootAssessmentLines: halfFootAssessmentLines.lines.length,
        halfFootAssessmentLevels: halfFootAssessmentLines.levelCount,
      },
      expected: expectedComparison,
    })}`,
  )
}
const overlayPath = join(
  dataDirectory,
  await availableFileName([
    'Proposed_CL.zip',
    'PR-CL.zip',
    'CL.zip',
    'Shapefiles Correctly Projected/PR-CL.zip',
  ]),
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
if (!scene.projected.wkt) {
  throw new Error('Site 6 Existing geometry is missing its model WKT.')
}
const centerlineCandidates = extractCenterlineCandidates(
  overlayResult.overlays,
  scene.projected.wkt,
)
if (centerlineCandidates.length !== 1) {
  throw new Error(
    `Expected one Site 6 centerline candidate, found ${centerlineCandidates.length}.`,
  )
}
const stationedAssessmentLines = stationAssessmentLines(
  assessmentLines.lines,
  centerlineCandidates[0],
  'a-to-b',
  0,
)
if (stationedAssessmentLines.includedCount <= 0) {
  throw new Error('Site 6 assessment lines did not intersect the centerline.')
}
const includedStationedLines = stationedAssessmentLines.items.filter(
  (item) => item.status === 'included' && item.selectedIntersection,
)
const crossSectionAttempts = includedStationedLines.map((item) => {
    try {
      return {
        item,
        scene: engine.buildCrossSection(
          'EX',
          existingIndex,
          'PR',
          proposedIndex,
          {
            id: item.line.id,
            label: `Section ${formatStation(item.selectedIntersection!.stationFeet)}`,
            stationLabel: formatStation(
              item.selectedIntersection!.stationFeet,
            ),
            points: item.line.points,
            direction: 'a-to-b',
          },
          0,
          1,
        ),
      }
    } catch (error) {
      throw new Error(
        `Site 6 cross-section build failed for ${item.line.id}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  })
const crossSectionCandidates = crossSectionAttempts
  .filter(
    (
      candidate,
    ): candidate is NonNullable<typeof candidate> =>
      candidate?.scene.baselineAverage.value != null &&
      candidate.scene.comparisonAverage.value != null,
  )
if (crossSectionCandidates.length === 0) {
  throw new Error(
    `No included Site 6 assessment line produced both discharge-weighted WSE averages: ${JSON.stringify({
      existingParams: existingRuns[existingIndex].run.params,
      proposedParams: proposedRuns[proposedIndex].run.params,
      attempts: crossSectionAttempts.slice(0, 3).map((candidate) =>
        candidate
          ? {
              existingAverage: candidate.scene.baselineAverage,
              proposedAverage: candidate.scene.comparisonAverage,
              validExistingWse: candidate.scene.samples.filter(
                (sample) => sample.baselineWse != null,
              ).length,
              validProposedWse: candidate.scene.samples.filter(
                (sample) => sample.comparisonWse != null,
              ).length,
              validExistingVelocity: candidate.scene.samples.filter(
                (sample) => sample.baselineNormalVelocity != null,
              ).length,
              validProposedVelocity: candidate.scene.samples.filter(
                (sample) => sample.comparisonNormalVelocity != null,
              ).length,
              warnings: candidate.scene.warnings,
            }
          : null,
      ),
    })}`,
  )
}
const crossSectionCandidate = crossSectionCandidates.reduce(
  (closest, candidate) =>
    Math.abs(candidate.item.selectedIntersection!.stationFeet - 300) <
    Math.abs(closest.item.selectedIntersection!.stationFeet - 300)
      ? candidate
      : closest,
)
const crossSectionScene = crossSectionCandidate.scene
const expectedCrossSection = {
  section: 'Section 4+20',
  samples: 25,
  existingAverage: 59.00000000572065,
  proposedAverage: 59.003314179696176,
  difference: 0.0033141739755251365,
}
if (
  crossSectionScene.samples.length < 25 ||
  crossSectionScene.warnings.length > 0 ||
  crossSectionScene.wseDifference == null ||
  !Number.isFinite(crossSectionScene.wseDifference)
) {
  throw new Error(
    `Site 6 cross-section sampling is incomplete: ${JSON.stringify({
      samples: crossSectionScene.samples.length,
      warnings: crossSectionScene.warnings,
      existingAverage: crossSectionScene.baselineAverage.value,
      proposedAverage: crossSectionScene.comparisonAverage.value,
      difference: crossSectionScene.wseDifference,
    })}`,
  )
}
if (
  crossSectionScene.line.label !== expectedCrossSection.section ||
  crossSectionScene.samples.length !== expectedCrossSection.samples ||
  Math.abs(
    crossSectionScene.baselineAverage.value! -
      expectedCrossSection.existingAverage,
  ) > 1e-8 ||
  Math.abs(
    crossSectionScene.comparisonAverage.value! -
      expectedCrossSection.proposedAverage,
  ) > 1e-8 ||
  Math.abs(crossSectionScene.wseDifference - expectedCrossSection.difference) >
    1e-8
) {
  throw new Error(
    `Site 6 cross-section hydraulics changed: ${JSON.stringify({
      actual: {
        section: crossSectionScene.line.label,
        samples: crossSectionScene.samples.length,
        existingAverage: crossSectionScene.baselineAverage.value,
        proposedAverage: crossSectionScene.comparisonAverage.value,
        difference: crossSectionScene.wseDifference,
      },
      expected: expectedCrossSection,
    })}`,
  )
}
const crossSectionCanvas = createCanvas(1500, 900)
renderCrossSectionDocument(
  crossSectionCanvas as unknown as HTMLCanvasElement,
  {
    scene: crossSectionScene,
    settings: {
      ...createDefaultCrossSectionSettings(),
      sectionName: crossSectionScene.line.label,
    },
  },
)
const crossSectionPixels = crossSectionCanvas
  .getContext('2d')
  .getImageData(
    0,
    0,
    crossSectionCanvas.width,
    crossSectionCanvas.height,
  ).data
let crossSectionColoredSamples = 0
for (let index = 0; index < crossSectionPixels.length; index += 64) {
  const red = crossSectionPixels[index]
  const green = crossSectionPixels[index + 1]
  const blue = crossSectionPixels[index + 2]
  if (Math.max(red, green, blue) - Math.min(red, green, blue) > 20) {
    crossSectionColoredSamples += 1
  }
}
if (crossSectionColoredSamples < 150) {
  throw new Error(
    `Rendered Site 6 cross section appears blank (${crossSectionColoredSamples} colored samples).`,
  )
}
const crossSectionOutputPath =
  process.env.HFG_TEST_CROSS_SECTION_OUTPUT ||
  join(tmpdir(), 'hydraulic-site6-cross-section.png')
await writeFile(
  crossSectionOutputPath,
  crossSectionCanvas.toBuffer('image/png'),
)
const stationRange = includedStationedLines.reduce(
  (range, item) => {
    const station = item.selectedIntersection!.stationFeet
    return [
      Math.min(range[0], station),
      Math.max(range[1], station),
    ]
  },
  [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
)
const expectedStationing = {
  centerlineVertices: 250,
  centerlineLengthFeet: 620.833682850606,
  included: 14,
  review: 1,
  excluded: 18,
  minimumStation: 28.902797495734713,
  maximumStation: 613.6849512605482,
}
if (
  centerlineCandidates[0].modelPoints.length !==
    expectedStationing.centerlineVertices ||
  Math.abs(
    centerlineCandidates[0].lengthFeet -
      expectedStationing.centerlineLengthFeet,
  ) > 1e-6 ||
  stationedAssessmentLines.includedCount !== expectedStationing.included ||
  stationedAssessmentLines.reviewCount !== expectedStationing.review ||
  stationedAssessmentLines.excludedCount !== expectedStationing.excluded ||
  Math.abs(stationRange[0] - expectedStationing.minimumStation) > 1e-6 ||
  Math.abs(stationRange[1] - expectedStationing.maximumStation) > 1e-6
) {
  throw new Error(
    `Site 6 centerline stationing changed: ${JSON.stringify({
      actual: {
        centerlineVertices: centerlineCandidates[0].modelPoints.length,
        centerlineLengthFeet: centerlineCandidates[0].lengthFeet,
        included: stationedAssessmentLines.includedCount,
        review: stationedAssessmentLines.reviewCount,
        excluded: stationedAssessmentLines.excludedCount,
        stationRange,
      },
      expected: expectedStationing,
    })}`,
  )
}
const stationTicks = generateCenterlineStationTicks(
  centerlineCandidates[0],
  'a-to-b',
  0,
  {
    minorInterval: 25,
    majorInterval: 100,
    labelInterval: 100,
  },
)
if (
  stationTicks.length !== 25 ||
  stationTicks.filter((tick) => tick.label).length !== 7
) {
  throw new Error(
    `Site 6 station tick generation changed (${stationTicks.length} ticks, ${stationTicks.filter((tick) => tick.label).length} labels).`,
  )
}
const selectedStationLabelId = stationTicks.find(
  (tick) => tick.label,
)?.id
const assessmentMapLayer: AssessmentMapLayer = {
  lines: includedStationedLines.map((item) => item.line),
  centerlineStationing: {
    centerline: centerlineCandidates[0],
    direction: 'a-to-b',
    ticks: stationTicks,
    selectedLabelId: selectedStationLabelId,
  },
  wseCallouts: includedStationedLines.map((item) => ({
    lineId: item.line.id,
    text: `WSE ${item.line.level.toFixed(1)} ft`,
    target: item.selectedIntersection!.mapPoint,
    tangent: item.selectedIntersection!.mapTangent,
  })),
}

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
  assessmentLineInterval: 1,
  assessmentLineColor: '#d92d20',
  assessmentLineWidth: 2,
  showAssessmentLines: true,
  showAssessmentLabels: true,
  assessmentLabelColor: '#172b3a',
  assessmentLabelFontSize: 18,
  assessmentLabelOffset: 28,
  assessmentLabelSide: 'alternate',
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
  centerlineStationing: {
    ...createDefaultFigureSettings().centerlineStationing,
    visible: true,
    showEndpoints: true,
    showDirectionArrow: true,
  },
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
  rotation: 0,
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
  {
    id: 'max-rise',
    kind: 'leader',
    hydraulicExtremum: 'max-rise',
    points: [
      extrema.rise.point,
      {
        x: extrema.rise.point.x + annotationOffset,
        y: extrema.rise.point.y + annotationOffset,
      },
    ],
    text: formatWseExtremumLabel('max-rise', extrema.rise.value),
    ...annotationStyle,
    rotation: 12,
  },
  {
    id: 'max-reduction',
    kind: 'leader',
    hydraulicExtremum: 'max-reduction',
    points: [
      extrema.reduction.point,
      {
        x: extrema.reduction.point.x - annotationOffset,
        y: extrema.reduction.point.y - annotationOffset,
      },
    ],
    text: formatWseExtremumLabel(
      'max-reduction',
      extrema.reduction.value,
    ),
    ...annotationStyle,
    color: '#175cd3',
    rotation: -12,
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
const rotatedText = {
  ...annotations[0],
  id: 'rotated-text',
  rotation: 90,
}
const rotatedTextCenter = mapPointToCanvas(
  rotatedText.points[0],
  engine.commonBounds(),
  renderSettings,
)
const rotatedTextHit = hitTestAnnotation(
  [rotatedText],
  engine.commonBounds(),
  renderSettings,
  rotatedTextCenter.x,
  rotatedTextCenter.y + 35,
)
const unrotatedTextMiss = hitTestAnnotation(
  [annotations[0]],
  engine.commonBounds(),
  renderSettings,
  rotatedTextCenter.x,
  rotatedTextCenter.y + 35,
)
const extremumLabelMoved = moveAnnotationPoints(
  annotations[5],
  'body',
  annotations[5].points,
  15,
  -12,
)
const extremumTargetMoved = moveAnnotationPoints(
  annotations[5],
  'start',
  annotations[5].points,
  15,
  -12,
)
const duplicatedExtremum = duplicateAnnotation(
  annotations[5],
  'duplicated-max-rise',
  10,
  14,
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
  extremumLabelMoved[0].x !== annotations[5].points[0].x ||
  extremumLabelMoved[1].x !== annotations[5].points[1].x + 15 ||
  extremumTargetMoved.some(
    (point, index) =>
      point.x !== annotations[5].points[index].x ||
      point.y !== annotations[5].points[index].y,
  ) ||
  rotatedTextHit?.id !== 'rotated-text' ||
  rotatedTextHit.part !== 'body' ||
  unrotatedTextMiss !== null ||
  duplicatedExtremum.id !== 'duplicated-max-rise' ||
  duplicatedExtremum.rotation !== annotations[5].rotation ||
  duplicatedExtremum.hydraulicExtremum !== undefined ||
  duplicatedExtremum.points.some(
    (point, index) =>
      point.x !== annotations[5].points[index].x + 10 ||
      point.y !== annotations[5].points[index].y + 14,
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
  assessmentMapLayer,
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
if (!selectedStationLabelId) {
  throw new Error('No Site 6 station label was available for selection testing.')
}
const stationLabelPoint = stationLabelPosition(
  assessmentMapLayer.centerlineStationing,
  engine.commonBounds(),
  renderSettings,
  selectedStationLabelId,
)
if (!stationLabelPoint) {
  throw new Error('The selected Site 6 station label was not laid out.')
}
const stationLabelScreen = mapPointToCanvas(
  stationLabelPoint,
  engine.commonBounds(),
  renderSettings,
)
const stationLabelHit = hitTestStationLabel(
  assessmentMapLayer.centerlineStationing,
  engine.commonBounds(),
  renderSettings,
  stationLabelScreen.x,
  stationLabelScreen.y,
)
if (stationLabelHit?.id !== selectedStationLabelId) {
  throw new Error('The rendered Site 6 station label was not selectable.')
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
    assessmentLines.lines,
  ),
  renderWseDifferenceMap(
    noOutlineCanvas as unknown as HTMLCanvasElement,
    scene,
    engine.commonBounds(),
    { ...outlineTestSettings, showDifferenceOutlines: false },
    [],
    assessmentLines.lines,
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

const assessmentTestSettings: FigureSettings = {
  ...outlineTestSettings,
  showDifferenceOutlines: false,
  showAssessmentLines: true,
}
const assessmentCanvas = createCanvas(1650, 1275)
const noAssessmentCanvas = createCanvas(1650, 1275)
await Promise.all([
  renderWseDifferenceMap(
    assessmentCanvas as unknown as HTMLCanvasElement,
    scene,
    engine.commonBounds(),
    assessmentTestSettings,
    [],
    assessmentMapLayer,
  ),
  renderWseDifferenceMap(
    noAssessmentCanvas as unknown as HTMLCanvasElement,
    scene,
    engine.commonBounds(),
    { ...assessmentTestSettings, showAssessmentLines: false },
    [],
    assessmentMapLayer,
  ),
])
const assessmentPixels = assessmentCanvas
  .getContext('2d')
  .getImageData(0, 0, assessmentCanvas.width, assessmentCanvas.height).data
const noAssessmentPixels = noAssessmentCanvas
  .getContext('2d')
  .getImageData(0, 0, noAssessmentCanvas.width, noAssessmentCanvas.height).data
let renderedAssessmentPixels = 0
for (let index = 0; index < assessmentPixels.length; index += 4) {
  const colorChange =
    Math.abs(assessmentPixels[index] - noAssessmentPixels[index]) +
    Math.abs(assessmentPixels[index + 1] - noAssessmentPixels[index + 1]) +
    Math.abs(assessmentPixels[index + 2] - noAssessmentPixels[index + 2])
  if (colorChange > 45) {
    renderedAssessmentPixels += 1
  }
}
if (renderedAssessmentPixels < 500) {
  throw new Error(
    `Existing WSE assessment lines appear missing (${renderedAssessmentPixels} changed pixels).`,
  )
}

const noAssessmentLabelCanvas = createCanvas(1650, 1275)
await renderWseDifferenceMap(
  noAssessmentLabelCanvas as unknown as HTMLCanvasElement,
  scene,
  engine.commonBounds(),
  { ...assessmentTestSettings, showAssessmentLabels: false },
  [],
  assessmentMapLayer,
)
const noAssessmentLabelPixels = noAssessmentLabelCanvas
  .getContext('2d')
  .getImageData(
    0,
    0,
    noAssessmentLabelCanvas.width,
    noAssessmentLabelCanvas.height,
  ).data
let renderedAssessmentLabelPixels = 0
for (let index = 0; index < assessmentPixels.length; index += 4) {
  const colorChange =
    Math.abs(assessmentPixels[index] - noAssessmentLabelPixels[index]) +
    Math.abs(
      assessmentPixels[index + 1] -
        noAssessmentLabelPixels[index + 1],
    ) +
    Math.abs(
      assessmentPixels[index + 2] -
        noAssessmentLabelPixels[index + 2],
    )
  if (colorChange > 45) renderedAssessmentLabelPixels += 1
}
if (renderedAssessmentLabelPixels < 150) {
  throw new Error(
    `Assessment WSE callouts appear missing (${renderedAssessmentLabelPixels} changed pixels).`,
  )
}

const positionedCalloutPoint = canvasPointToMap(
  320,
  240,
  engine.commonBounds(),
  assessmentTestSettings,
)
const positionedCalloutLayer: AssessmentMapLayer = {
  lines: assessmentMapLayer.lines,
  wseCallouts: assessmentMapLayer.wseCallouts?.slice(0, 1).map((callout) => ({
    ...callout,
    labelPoint: positionedCalloutPoint,
  })),
}
const positionedCalloutHit = hitTestAssessmentCallout(
  positionedCalloutLayer,
  engine.commonBounds(),
  assessmentTestSettings,
  320,
  240,
)
if (
  !positionedCalloutHit ||
  positionedCalloutHit.lineId !==
    positionedCalloutLayer.wseCallouts?.[0]?.lineId
) {
  throw new Error('An engineer-positioned assessment WSE callout was not selectable.')
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
  assessmentMapLayer,
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
        maxWseRise: extrema.rise.value,
        maxWseReduction: extrema.reduction.value,
        assessmentLines: assessmentLines.lines.length,
        assessmentLevels: assessmentLines.levelCount,
        assessmentElevationRange: [
          assessmentLines.minimumLevel,
          assessmentLines.maximumLevel,
        ],
        halfFootAssessmentLines: halfFootAssessmentLines.lines.length,
        halfFootAssessmentLevels: halfFootAssessmentLines.levelCount,
      },
      planViewResults: {
        run: depthScene.selection!.run.name,
        outputPath: planViewOutputPath,
        geometryOutputPath,
        geometryOutputs: geometryScenes.map((result) => result.result.label),
        parameters: scalarScenes.map((result) => ({
          name: result.result.paramName,
          validNodes: result.validNodes,
          range: [result.autoMin, result.autoMax],
        })),
        coloredPixelSamples: planViewColoredSamples,
        figureSetItems: figureSetItems.length,
      },
      overlay: {
        layers: overlayResult.overlays.map((overlay) => overlay.name),
        features: overlayFeatureCount,
        centerlineVertices: centerlineCandidates[0].modelPoints.length,
        centerlineLengthFeet: centerlineCandidates[0].lengthFeet,
        stationedAssessmentLines: {
          included: stationedAssessmentLines.includedCount,
          review: stationedAssessmentLines.reviewCount,
          excluded: stationedAssessmentLines.excludedCount,
          stationRange,
        },
        stationTicks: stationTicks.length,
        stationLabels: stationTicks.filter((tick) => tick.label).length,
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
        sampledResultLabel: annotations.find(
          (annotation) => annotation.id === 'result',
        )?.text,
        basemap: testBasemap,
        differenceOutlinePixels,
        assessmentLinePixels: renderedAssessmentPixels,
        selectedStationLabelId,
        crossSection: {
          outputPath: crossSectionOutputPath,
          section: crossSectionScene.line.label,
          samples: crossSectionScene.samples.length,
          existingAverage: crossSectionScene.baselineAverage.value,
          proposedAverage: crossSectionScene.comparisonAverage.value,
          difference: crossSectionScene.wseDifference,
          coloredPixelSamples: crossSectionColoredSamples,
        },
      },
    },
    null,
    2,
  ),
)
