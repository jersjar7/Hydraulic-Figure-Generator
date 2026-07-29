import type {
  AssessmentMapLayer,
  Bounds,
  DifferenceLegendElementStyle,
  FigureSettings,
  MapAnnotation,
  MapElementBounds,
  MapElementKey,
  MapElementPositions,
  MapOverlay,
  NorthElementStyle,
  ScaleElementStyle,
  WetDryElementStyle,
  WseAssessmentLine,
  WseDifferenceScene,
} from './types'
import {
  drawAnnotations,
  drawAnnotationSelection,
} from './map/annotationLayer'
import {
  drawAssessmentCallouts,
  drawAssessmentLines,
  drawAssessmentReviewMarkers,
  drawAssessmentSelection,
  normalizeAssessmentMapLayer,
} from './map/assessmentLayer'
import { drawBasemap } from './map/basemapLayer'
import { drawOverlays } from './map/overlayLayer'
import { drawCenterlineStationing } from './map/stationingLayer'
import {
  differenceBandCount,
  differenceBreaks,
  differenceColor,
  drawContourLevels,
  drawValidBoundary,
  fillDifferenceBands,
  fillWetDry,
  localCoordinates,
} from './map/hydraulicLayers'
import {
  anchorBox,
  drawElementBox,
  drawMapElementSelection,
} from './map/mapElementLayout'
import { drawTitle, resolveTitle } from './map/titleElement'
import {
  FRAMES,
  makeMapView as makeView,
  type MapFrame as Frame,
} from './map/view'

export {
  duplicateAnnotation,
  moveAnnotationPoints,
  type AnnotationHitPart,
} from './map/annotationGeometry'
export { hitTestAnnotation } from './map/annotationLayer'
export {
  formatHydraulicResultLabel,
  sampleHydraulicResult,
  type HydraulicResultSample,
} from './map/hydraulicSampling'
export {
  canvasPointToMap,
  DEFAULT_ELEMENT_POSITIONS,
  FRAMES,
  mapPointToCanvas,
} from './map/view'
export {
  hitTestAssessmentCallout,
  type AssessmentCalloutHit,
} from './map/assessmentLayer'
export {
  hitTestStationLabel,
  stationLabelPosition,
  type StationLabelHit,
} from './map/stationingLayer'

function formatLegendValue(value: number, decimalPlaces: number) {
  return value.toFixed(Math.max(0, Math.min(3, decimalPlaces)))
}

function legendTitle(style: DifferenceLegendElementStyle) {
  const title = style.title.trim()
  const units = style.units.trim()
  return units ? `${title} (${units})` : title
}

function drawDifferenceLegend(
  context: CanvasRenderingContext2D,
  maxAbsolute: number,
  interval: number | null,
  frame: Frame,
  position: MapElementPositions['diffLegend'],
  style: DifferenceLegendElementStyle,
) {
  const bandCount = differenceBandCount(maxAbsolute, interval)
  const padding = 12
  const title = legendTitle(style)
  const labels = Array.from({ length: bandCount + 1 }, (_, index) =>
    formatLegendValue(
      -maxAbsolute + (index * 2 * maxAbsolute) / bandCount,
      style.decimalPlaces,
    ),
  )
  const titleHeight = style.fontSize + 14
  context.save()
  context.font = `700 ${style.fontSize + 2}px "Segoe UI", Arial, sans-serif`
  const titleWidth = context.measureText(title).width
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  const labelWidth = Math.max(
    ...labels.map((label) => context.measureText(label).width),
  )

  let width: number
  let height: number
  if (style.orientation === 'horizontal') {
    const blockWidth = Math.max(style.swatchSize * 2, labelWidth + 36)
    width = Math.max(
      padding * 2 + titleWidth,
      padding * 2 + blockWidth * bandCount,
    )
    height = padding * 2 + titleHeight + style.swatchSize + style.fontSize + 14
  } else {
    const blockHeight = Math.max(style.swatchSize, style.fontSize + 4)
    const swatchWidth = Math.round(style.swatchSize * 1.7)
    width = Math.max(
      padding * 2 + titleWidth,
      padding * 2 + swatchWidth + 12 + labelWidth,
    )
    height =
      padding * 2 +
      titleHeight +
      bandCount * blockHeight +
      style.fontSize / 2
  }

  const [x, y] = anchorBox(
    position.anchor,
    width,
    height,
    frame,
    18,
    position.offX,
    position.offY,
  )
  const bounds = { key: 'diffLegend', x, y, width, height } as const
  drawElementBox(context, bounds, style)
  context.fillStyle = style.textColor
  context.font = `700 ${style.fontSize + 2}px "Segoe UI", Arial, sans-serif`
  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.fillText(title, x + padding, y + padding)

  const barX = x + padding
  const barTop = y + padding + titleHeight
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  context.strokeStyle = style.borderColor
  context.fillStyle = style.textColor
  if (style.orientation === 'horizontal') {
    const blockWidth = (width - padding * 2) / bandCount
    for (let band = 0; band < bandCount; band += 1) {
      const middle =
        -maxAbsolute + ((band + 0.5) * 2 * maxAbsolute) / bandCount
      context.fillStyle = differenceColor(middle, maxAbsolute) ?? '#fff'
      context.fillRect(
        barX + band * blockWidth,
        barTop,
        blockWidth,
        style.swatchSize,
      )
    }
    context.strokeRect(
      barX + 0.5,
      barTop + 0.5,
      width - padding * 2,
      style.swatchSize,
    )
    context.fillStyle = style.textColor
    context.textBaseline = 'top'
    labels.forEach((label, index) => {
      const labelX = barX + (index * (width - padding * 2)) / bandCount
      context.textAlign =
        index === 0 ? 'left' : index === bandCount ? 'right' : 'center'
      context.fillText(label, labelX, barTop + style.swatchSize + 7)
    })
  } else {
    const blockHeight = Math.max(style.swatchSize, style.fontSize + 4)
    const swatchWidth = Math.round(style.swatchSize * 1.7)
    const barHeight = bandCount * blockHeight
    const barBottom = barTop + barHeight
    for (let band = 0; band < bandCount; band += 1) {
      const middle =
        -maxAbsolute + ((band + 0.5) * 2 * maxAbsolute) / bandCount
      context.fillStyle = differenceColor(middle, maxAbsolute) ?? '#fff'
      context.fillRect(
        barX,
        barBottom - (band + 1) * blockHeight,
        swatchWidth,
        blockHeight,
      )
    }
    context.strokeRect(barX + 0.5, barTop + 0.5, swatchWidth, barHeight)
    context.fillStyle = style.textColor
    context.textAlign = 'left'
    context.textBaseline = 'middle'
    labels.forEach((label, index) => {
      const labelY = barBottom - index * blockHeight
      context.beginPath()
      context.moveTo(barX + swatchWidth, labelY)
      context.lineTo(barX + swatchWidth + 5, labelY)
      context.stroke()
      context.fillText(label, barX + swatchWidth + 9, labelY)
    })
  }
  context.restore()
  return bounds
}

function drawNorthArrow(
  context: CanvasRenderingContext2D,
  frame: Frame,
  rotationRadians: number,
  position: MapElementPositions['north'],
  style: NorthElementStyle,
) {
  const diameter = style.size
  const radius = diameter / 2
  const [x, y] = anchorBox(
    position.anchor,
    diameter,
    diameter,
    frame,
    18,
    position.offX,
    position.offY,
  )
  const bounds = { key: 'north', x, y, width: diameter, height: diameter } as const
  const centerX = x + radius
  const centerY = y + radius
  const rotation =
    style.rotationMode === 'true-north' ? rotationRadians : 0
  context.save()
  context.beginPath()
  context.arc(centerX, centerY, radius, 0, Math.PI * 2)
  if (style.background) {
    context.globalAlpha = Math.max(0, Math.min(1, style.backgroundOpacity))
    context.fillStyle = style.backgroundColor
    context.fill()
    context.globalAlpha = 1
  }
  if (style.borderWidth > 0) {
    context.lineWidth = style.borderWidth
    context.strokeStyle = style.borderColor
    context.stroke()
  }
  context.translate(centerX, centerY)
  context.rotate(rotation)
  context.fillStyle = style.color
  context.strokeStyle = style.color
  context.lineWidth = Math.max(2, diameter * 0.035)
  if (style.style === 'simple') {
    context.beginPath()
    context.moveTo(0, radius * 0.48)
    context.lineTo(0, -radius * 0.45)
    context.stroke()
    context.beginPath()
    context.moveTo(0, -radius * 0.62)
    context.lineTo(radius * 0.18, -radius * 0.28)
    context.lineTo(0, -radius * 0.36)
    context.lineTo(-radius * 0.18, -radius * 0.28)
    context.closePath()
    context.fill()
  } else if (style.style === 'compass') {
    context.beginPath()
    context.moveTo(0, -radius * 0.62)
    context.lineTo(radius * 0.16, 0)
    context.lineTo(0, radius * 0.5)
    context.lineTo(-radius * 0.16, 0)
    context.closePath()
    context.stroke()
    context.beginPath()
    context.moveTo(0, -radius * 0.62)
    context.lineTo(radius * 0.16, 0)
    context.lineTo(0, -radius * 0.08)
    context.closePath()
    context.fill()
    context.beginPath()
    context.moveTo(-radius * 0.48, 0)
    context.lineTo(radius * 0.48, 0)
    context.stroke()
  } else {
    context.beginPath()
    context.moveTo(0, -radius * 0.55)
    context.lineTo(radius * 0.34, radius * 0.5)
    context.lineTo(0, radius * 0.24)
    context.lineTo(-radius * 0.34, radius * 0.5)
    context.closePath()
    context.fill()
  }
  context.restore()

  if (style.showLabel) {
    const labelRadius = radius * 0.75
    const labelX = centerX + Math.sin(rotation) * labelRadius
    const labelY = centerY - Math.cos(rotation) * labelRadius
    context.save()
    context.fillStyle = style.color
    context.font = `700 ${Math.max(12, diameter * 0.2)}px "Segoe UI", Arial, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('N', labelX, labelY)
    context.restore()
  }
  return bounds
}

function niceScaleValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return [1, 2, 5, 10]
    .map((factor) => factor * magnitude)
    .reduce((best, candidate) =>
      Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best,
    )
}

function drawScaleBar(
  context: CanvasRenderingContext2D,
  frame: Frame,
  feetPerPixel: number,
  position: MapElementPositions['scale'],
  style: ScaleElementStyle,
) {
  const unitFactors = {
    'us-survey-ft': 1,
    ft: 0.3048006096012192 / 0.3048,
    mi: 1 / 5280,
    m: 0.3048006096012192,
  }
  const unitLabels = {
    'us-survey-ft': 'ft (U.S. Survey)',
    ft: 'ft',
    mi: 'mi',
    m: 'm',
  }
  const unitsPerSurveyFoot = unitFactors[style.units]
  const divisions = Math.max(2, Math.min(6, Math.round(style.divisions)))
  const targetUnits = 170 * feetPerPixel * unitsPerSurveyFoot
  const totalUnits =
    style.lengthMode === 'manual'
      ? Math.max(0.0001, style.manualLength)
      : niceScaleValue(targetUnits)
  const totalFeet = totalUnits / unitsPerSurveyFoot
  const totalPixels = totalFeet / feetPerPixel
  const segmentPixels = totalPixels / divisions
  const padding = 12
  const barHeight = Math.max(8, Math.round(style.fontSize * 0.58))
  const width = totalPixels + padding * 2
  const height = barHeight + style.fontSize * 2 + padding * 2 + 14
  const [x, y] = anchorBox(
    position.anchor,
    width,
    height,
    frame,
    18,
    position.offX,
    position.offY,
  )
  const bounds = { key: 'scale', x, y, width, height } as const
  context.save()
  drawElementBox(context, bounds, style)
  const barX = x + padding
  const barY = y + padding
  context.strokeStyle = style.lineColor
  context.lineWidth = 1.5
  if (style.style === 'alternating') {
    for (let segment = 0; segment < divisions; segment += 1) {
      context.fillStyle =
        segment % 2 === 0 ? style.fillColor : style.backgroundColor
      context.fillRect(
        barX + segment * segmentPixels,
        barY,
        segmentPixels,
        barHeight,
      )
    }
    context.strokeRect(barX, barY, totalPixels, barHeight)
  } else {
    context.beginPath()
    context.moveTo(barX, barY + barHeight)
    context.lineTo(barX + totalPixels, barY + barHeight)
    context.stroke()
  }
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  context.fillStyle = style.textColor
  context.textAlign = 'center'
  context.textBaseline = 'top'
  for (let index = 0; index <= divisions; index += 1) {
    const markerX = barX + index * segmentPixels
    context.beginPath()
    context.moveTo(
      markerX,
      style.style === 'ticks' ? barY + barHeight - 5 : barY + barHeight,
    )
    context.lineTo(markerX, barY + barHeight + 5)
    context.stroke()
    context.fillText(
      ((index * totalUnits) / divisions).toFixed(style.decimalPlaces),
      markerX,
      barY + barHeight + 7,
    )
  }
  context.fillText(
    unitLabels[style.units],
    barX + totalPixels / 2,
    barY + barHeight + style.fontSize + 12,
  )
  context.restore()
  return bounds
}

function drawWetDryKey(
  context: CanvasRenderingContext2D,
  frame: Frame,
  settings: FigureSettings,
  position: MapElementPositions['wetDry'],
  style: WetDryElementStyle,
) {
  const padding = 12
  const swatchHeight = Math.max(10, Math.round(style.swatchSize * 0.55))
  const rows = [
    [style.wetLabel, settings.newlyWetColor],
    [style.dryLabel, settings.newlyDryColor],
  ] as const
  context.save()
  context.font = `700 ${style.fontSize + 1}px "Segoe UI", Arial, sans-serif`
  const titleWidth = context.measureText(style.title).width
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  const itemWidths = rows.map(
    ([label]) =>
      style.swatchSize + 10 + context.measureText(label).width,
  )
  const titleHeight = style.fontSize + 14
  const width =
    style.orientation === 'horizontal'
      ? Math.max(
          titleWidth + padding * 2,
          itemWidths.reduce((total, value) => total + value, 0) +
            padding * 2 +
            20,
        )
      : Math.max(titleWidth, ...itemWidths) + padding * 2
  const height =
    style.orientation === 'horizontal'
      ? padding * 2 + titleHeight + Math.max(style.fontSize, swatchHeight)
      : padding * 2 + titleHeight + rows.length * (style.fontSize + 8)
  const [x, y] = anchorBox(
    position.anchor,
    width,
    height,
    frame,
    18,
    position.offX,
    position.offY,
  )
  const bounds = { key: 'wetDry', x, y, width, height } as const
  drawElementBox(context, bounds, style)
  context.fillStyle = style.textColor
  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.font = `700 ${style.fontSize + 1}px "Segoe UI", Arial, sans-serif`
  context.fillText(style.title, x + padding, y + padding)
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  let rowX = x + padding
  rows.forEach(([label, color], index) => {
    const rowY =
      y +
      padding +
      titleHeight +
      (style.orientation === 'vertical' ? index * (style.fontSize + 8) : 0)
    context.fillStyle = color
    context.fillRect(rowX, rowY, style.swatchSize, swatchHeight)
    context.fillStyle = style.textColor
    context.fillText(
      label,
      rowX + style.swatchSize + 10,
      rowY + (swatchHeight - style.fontSize) / 2,
    )
    if (style.orientation === 'horizontal') {
      rowX += itemWidths[index] + 20
    }
  })
  context.restore()
  return bounds
}

export async function renderWseDifferenceMap(
  canvas: HTMLCanvasElement,
  scene: WseDifferenceScene,
  commonBounds: Bounds,
  settings: FigureSettings,
  overlays: MapOverlay[],
  assessmentInput: AssessmentMapLayer | WseAssessmentLine[] = [],
  annotations: MapAnnotation[] = [],
  selectedAnnotationId: string | null = null,
  selectedElementKey: MapElementKey | null = null,
  signal?: AbortSignal,
) {
  const frame = FRAMES[settings.orientation]
  canvas.width = frame.width
  canvas.height = frame.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not create the map canvas.')
  const view = makeView(commonBounds, frame, settings)
  const assessmentLayer = normalizeAssessmentMapLayer(assessmentInput)
  const legendBound =
    settings.legendBound && settings.legendBound > 0
      ? settings.legendBound
      : scene.maxAbs

  context.clearRect(0, 0, frame.width, frame.height)
  context.fillStyle = '#dce4ec'
  context.fillRect(0, 0, frame.width, frame.height)
  await drawBasemap(context, view, settings.basemapOpacity, signal)

  context.save()
  context.translate(view.originX, view.originY)
  context.rotate(view.rotationRadians)
  const existingCoordinates = localCoordinates(scene.projected, view)
  fillDifferenceBands(
    context,
    existingCoordinates.localX,
    existingCoordinates.localY,
    scene.projected.tris,
    scene.diff,
    legendBound,
    settings.legendInterval,
  )

  const proposedCoordinates = localCoordinates(scene.proposedProjected, view)
  if (settings.showWetDry) {
    fillWetDry(
      context,
      existingCoordinates.localX,
      existingCoordinates.localY,
      scene.projected.tris,
      scene.wetDry,
      settings,
    )
    fillWetDry(
      context,
      proposedCoordinates.localX,
      proposedCoordinates.localY,
      scene.proposedProjected.tris,
      scene.proposedWetDry,
      settings,
    )
  }
  if (settings.showDifferenceOutlines) {
    drawContourLevels(
      context,
      existingCoordinates.localX,
      existingCoordinates.localY,
      scene.projected.tris,
      scene.diff,
      differenceBreaks(legendBound, settings.legendInterval),
      settings.differenceOutlineColor,
    )
    drawValidBoundary(
      context,
      existingCoordinates.localX,
      existingCoordinates.localY,
      scene.projected.tris,
      scene.diff,
      settings.differenceOutlineColor,
    )
  }
  if (settings.showAssessmentLines) {
    drawAssessmentLines(
      context,
      assessmentLayer.lines,
      view,
      settings.assessmentLineColor,
      settings.assessmentLineWidth,
    )
    drawAssessmentSelection(
      context,
      assessmentLayer.selectedLine,
      view,
      settings.assessmentLineWidth,
    )
  }
  if (settings.showOverlays) drawOverlays(context, overlays, view)
  context.restore()

  drawCenterlineStationing(
    context,
    assessmentLayer.centerlineStationing,
    view,
    settings,
    frame,
  )
  if (settings.showAssessmentLines) {
    drawAssessmentCallouts(
      context,
      assessmentLayer,
      view,
      settings,
      frame,
    )
    drawAssessmentReviewMarkers(context, assessmentLayer, view)
  }
  drawAnnotations(context, annotations, view)
  const selectedAnnotation = annotations.find(
    (annotation) => annotation.id === selectedAnnotationId,
  )
  if (selectedAnnotation) {
    drawAnnotationSelection(context, selectedAnnotation, view)
  }

  const positions = settings.elementPositions
  const styles = settings.elementStyles
  const elementBounds: MapElementBounds[] = []
  if (settings.showTitle) {
    elementBounds.push(
      drawTitle(
        context,
        resolveTitle(scene, settings.titleTemplate),
        frame,
        positions.title,
        styles.title,
      ),
    )
  }
  if (settings.showLegend) {
    elementBounds.push(
      drawDifferenceLegend(
        context,
        legendBound,
        settings.legendInterval,
        frame,
        positions.diffLegend,
        styles.diffLegend,
      ),
    )
  }
  if (settings.showNorth) {
    elementBounds.push(
      drawNorthArrow(
        context,
        frame,
        view.rotationRadians,
        positions.north,
        styles.north,
      ),
    )
  }
  if (settings.showScale) {
    elementBounds.push(
      drawScaleBar(
        context,
        frame,
        scene.projected.ftPerMerc / view.scale,
        positions.scale,
        styles.scale,
      ),
    )
  }
  if (settings.showWetDry && settings.showWetDryKey) {
    elementBounds.push(
      drawWetDryKey(
        context,
        frame,
        settings,
        positions.wetDry,
        styles.wetDry,
      ),
    )
  }
  const selectedElement = elementBounds.find(
    (bounds) => bounds.key === selectedElementKey,
  )
  if (selectedElement) {
    drawMapElementSelection(context, selectedElement)
  }
  return elementBounds
}
