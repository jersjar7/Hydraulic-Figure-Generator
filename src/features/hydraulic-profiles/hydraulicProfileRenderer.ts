import type {
  HydraulicProfileLine,
  HydraulicProfileScene,
  MapElementBounds,
} from '../../core/types'
import {
  clipHydraulicProfileLineAtGround,
  hydraulicProfileLineSegments,
  interpolateHydraulicProfileLine,
  type HydraulicProfileSegment,
} from '../../core/hydraulic-profiles/clipHydraulicProfileLine'
import { hydraulicCrossSectionCulvertPoints } from '../../core/hydraulic-profiles/culvertGeometry'
import type {
  HydraulicProfileFigureSettings,
  HydraulicProfileLineStyle,
} from './hydraulicProfileSettings'
import { hydraulicProfileLineStyle } from './hydraulicProfileSettings'
import {
  drawChartAxes,
  drawChartLabels,
  drawChartLegend,
  type ChartPlotFrame,
} from '../chart-tools/chartCanvas'
import {
  hydraulicProfileChartAxes,
  hydraulicProfileChartLayout,
  hydraulicProfileChartLegend,
  hydraulicProfileChartSeries,
} from './hydraulicProfileChartStyle'

export const HYDRAULIC_PROFILE_FRAMES = {
  landscape: { width: 1500, height: 900 },
  portrait: { width: 1050, height: 1350 },
} as const

export type HydraulicProfileRenderDocument = {
  scene: HydraulicProfileScene
  settings: HydraulicProfileFigureSettings
}

export function hydraulicProfileLinePoints(line: HydraulicProfileLine) {
  return hydraulicProfileLineSegments(line).flat()
}

export function drawHydraulicProfileLineSegments(
  context: CanvasRenderingContext2D,
  segments: HydraulicProfileSegment[],
  x: (value: number) => number,
  y: (value: number) => number,
  style: HydraulicProfileLineStyle,
) {
  context.save()
  context.strokeStyle = style.color
  context.lineWidth = style.width
  context.setLineDash(style.dash)
  context.lineJoin = 'round'
  context.lineCap = 'round'
  context.beginPath()
  segments.forEach((segment) => {
    segment.forEach((point, index) => {
      if (index === 0) context.moveTo(x(point.distance), y(point.elevation))
      else context.lineTo(x(point.distance), y(point.elevation))
    })
  })
  context.stroke()
  context.restore()
}

export function drawHydraulicProfileEarthFill(
  context: CanvasRenderingContext2D,
  ground: HydraulicProfileLine,
  x: (value: number) => number,
  y: (value: number) => number,
  bottom: number,
) {
  context.save()
  context.fillStyle = '#eee6da'
  hydraulicProfileLineSegments(ground).forEach((points) => {
    if (points.length < 2) return
    context.beginPath()
    context.moveTo(x(points[0].distance), bottom)
    points.forEach((point) => context.lineTo(x(point.distance), y(point.elevation)))
    context.lineTo(x(points.at(-1)!.distance), bottom)
    context.closePath()
    context.fill()
  })
  context.restore()
}

export function drawHydraulicProfileInundation(
  context: CanvasRenderingContext2D,
  ground: HydraulicProfileLine,
  surface: HydraulicProfileLine | undefined,
  x: (value: number) => number,
  y: (value: number) => number,
) {
  if (!surface) return
  context.save()
  context.fillStyle = 'rgba(54, 145, 209, 0.22)'
  clipHydraulicProfileLineAtGround(surface, ground).forEach((wet) => {
    if (wet.length < 2) return
    const groundElevations = wet.map(({ distance }) =>
      interpolateHydraulicProfileLine(ground, distance),
    )
    if (groundElevations.some((elevation) => elevation == null)) return
    context.beginPath()
    wet.forEach((point, index) => {
      if (index === 0) context.moveTo(x(point.distance), y(point.elevation))
      else context.lineTo(x(point.distance), y(point.elevation))
    })
    for (let index = wet.length - 1; index >= 0; index -= 1) {
      context.lineTo(x(wet[index].distance), y(groundElevations[index]!))
    }
    context.closePath()
    context.fill()
  })
  context.restore()
}

function roundedBox(
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
) {
  context.beginPath()
  context.roundRect(left, top, width, height, 5)
  context.fillStyle = 'rgba(255, 255, 255, 0.94)'
  context.fill()
  context.strokeStyle = '#aeb8c3'
  context.lineWidth = 1
  context.stroke()
}

export function renderHydraulicProfileDocument(
  canvas: HTMLCanvasElement,
  document: HydraulicProfileRenderDocument,
): MapElementBounds[] {
  const { scene, settings } = document
  const frame = HYDRAULIC_PROFILE_FRAMES[settings.orientation]
  canvas.width = frame.width
  canvas.height = frame.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas rendering is unavailable.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)

  const portrait = settings.orientation === 'portrait'
  const plot: ChartPlotFrame = {
    left: portrait ? 105 : 120,
    top: portrait ? 165 : 135,
    width: canvas.width - (portrait ? 165 : 200),
    height: canvas.height - (portrait ? 315 : 255),
  }
  const series = hydraulicProfileChartSeries(settings, scene.section.lines)
  const visibleSlots = new Set(series.filter((item) => item.visible).map((item) => item.id))
  const lineBySlot = new Map(scene.section.lines.map((line) => [line.datasetSlot, line]))
  const lines = series.map((item) => lineBySlot.get(item.id)!).filter(Boolean)
  const culvertGround = scene.section.primaryGround ?? scene.section.grounds[0]
  const culvertPoints = scene.culvert && culvertGround
    ? hydraulicCrossSectionCulvertPoints(scene.culvert, culvertGround)
    : []
  const points = [...lines.flatMap(hydraulicProfileLinePoints), ...culvertPoints]
  const rawXMinimum = Math.min(...points.map((point) => point.distance))
  const rawXMaximum = Math.max(...points.map((point) => point.distance))
  const rawYMinimum = Math.min(...points.map((point) => point.elevation))
  const rawYMaximum = Math.max(...points.map((point) => point.elevation))
  const xSpan = Math.max(rawXMaximum - rawXMinimum, 1)
  const ySpan = Math.max(rawYMaximum - rawYMinimum, 1)
  const xMinimum = rawXMinimum - xSpan * 0.03
  const xMaximum = rawXMaximum + xSpan * 0.03
  const automaticYMinimum = rawYMinimum - ySpan * 0.16
  const automaticYMaximum = rawYMaximum + ySpan * 0.12
  const requestedYMinimum = settings.yMinimum ?? automaticYMinimum
  const requestedYMaximum = settings.yMaximum ?? automaticYMaximum
  const yMinimum = requestedYMaximum > requestedYMinimum ? requestedYMinimum : automaticYMinimum
  const yMaximum = requestedYMaximum > requestedYMinimum ? requestedYMaximum : automaticYMaximum
  const axes = hydraulicProfileChartAxes(settings)
  const { x, y } = drawChartAxes(
    context,
    plot,
    { minimum: xMinimum, maximum: xMaximum },
    { minimum: yMinimum, maximum: yMaximum },
    axes,
    portrait ? 6 : 10,
  )

  const earthFillGround = scene.section.grounds.find(
    ({ datasetSlot }) => datasetSlot === settings.earthFillGroundSlot,
  ) ?? scene.section.primaryGround
  const inundationGround = scene.section.grounds.find(
    ({ datasetSlot }) => datasetSlot === settings.inundationGroundSlot,
  ) ?? earthFillGround
  const inundationSurface = scene.section.surfaces.find(
    ({ datasetSlot }) => datasetSlot === settings.inundationSurfaceSlot,
  ) ?? scene.section.surfaces[0]
  const wseClippingGround = scene.section.grounds.find(
    ({ datasetSlot }) => datasetSlot === settings.wseClippingGroundSlot,
  ) ?? earthFillGround ?? scene.section.primaryGround
  if (settings.showEarthFill && earthFillGround) {
    drawHydraulicProfileEarthFill(context, earthFillGround, x, y, plot.top + plot.height)
  }
  if (settings.showInundation && inundationGround) {
    drawHydraulicProfileInundation(context, inundationGround, inundationSurface, x, y)
  }
  lines.filter((profileLine) => visibleSlots.has(profileLine.datasetSlot)).forEach((profileLine) => drawHydraulicProfileLineSegments(
    context,
    settings.clipWseAtGround && profileLine.kind === 'wse' && wseClippingGround
      ? clipHydraulicProfileLineAtGround(profileLine, wseClippingGround)
      : hydraulicProfileLineSegments(profileLine),
    x,
    y,
    hydraulicProfileLineStyle(settings, profileLine.datasetSlot),
  ))
  if (scene.culvert && culvertPoints.length > 1) {
    drawHydraulicProfileLineSegments(
      context,
      [culvertPoints],
      x,
      y,
      {
        color: scene.culvert.color,
        width: scene.culvert.lineWidth,
        dash: scene.culvert.dash,
      },
    )
  }

  if (settings.showThalweg && earthFillGround && visibleSlots.has(earthFillGround.datasetSlot) && hydraulicProfileLinePoints(earthFillGround).length > 0) {
    const groundPoints = hydraulicProfileLinePoints(earthFillGround)
    const thalweg = groundPoints.reduce((best, point) => point.elevation < best.elevation ? point : best)
    context.save()
    context.fillStyle = hydraulicProfileLineStyle(settings, earthFillGround.datasetSlot).color
    context.beginPath()
    context.arc(x(thalweg.distance), y(thalweg.elevation), 5, 0, Math.PI * 2)
    context.fill()
    context.font = `600 ${Math.max(13, settings.fontSize - 3)}px Arial`
    context.textAlign = 'center'
    context.fillText(`Thalweg ${thalweg.elevation.toFixed(2)}`, x(thalweg.distance), y(thalweg.elevation) + 22)
    context.restore()
  }
  drawChartLegend(
    context,
    [
      ...series.filter((item) => item.visible).map((item) => ({ label: item.label, style: item.style })),
      ...(scene.culvert ? [{
        label: scene.culvert.name,
        style: {
          color: scene.culvert.color,
          width: scene.culvert.lineWidth,
          dash: scene.culvert.dash,
        },
      }] : []),
    ],
    plot,
    hydraulicProfileChartLegend(settings),
    axes.textColor,
    axes.fontSize,
  )
  drawChartLabels(
    context,
    canvas,
    plot,
    hydraulicProfileChartLayout(settings),
    axes,
    `Station ${scene.section.stationLabel}`,
  )

  context.save()
  context.font = `600 ${Math.max(14, settings.fontSize - 2)}px Arial`
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  const direction = `Cross section is looking ${settings.lookingDirection}`
  const width = context.measureText(direction).width + 24
  const left = plot.left + 12
  const top = plot.top + plot.height - settings.fontSize - 36
  roundedBox(context, left, top, width, settings.fontSize + 24)
  context.fillStyle = settings.textColor
  context.fillText(direction, left + 12, top + settings.fontSize + 4)
  context.restore()
  return []
}
