import { hydraulicLongitudinalCulvertPoints } from '../../core/hydraulic-profiles/culvertGeometry'
import { hydraulicProfileLineSegments } from '../../core/hydraulic-profiles/clipHydraulicProfileLine'
import type { HydraulicLongitudinalScene } from '../../core/types'
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
import {
  drawHydraulicProfileEarthFill,
  drawHydraulicProfileInundation,
  drawHydraulicProfileLineSegments,
  HYDRAULIC_PROFILE_FRAMES,
  hydraulicProfileLinePoints,
} from './hydraulicProfileRenderer'
import { hydraulicProfileLineStyle, type HydraulicProfileFigureSettings } from './hydraulicProfileSettings'
import { formatLongitudinalAxisStation } from '../../core/hydraulic-profiles/longitudinalStationing'
import {
  layoutLongitudinalStationLabels,
  type LongitudinalStationLabelBounds,
} from '../chart-tools/longitudinalStationLabels'

export type HydraulicLongitudinalRenderDocument = {
  scene: HydraulicLongitudinalScene
  settings: HydraulicProfileFigureSettings
}

export function renderHydraulicLongitudinalDocument(
  canvas: HTMLCanvasElement,
  document: HydraulicLongitudinalRenderDocument,
): LongitudinalStationLabelBounds[] {
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
  const series = hydraulicProfileChartSeries(settings, scene.lines)
  const visibleSlots = new Set(series.filter(({ visible }) => visible).map(({ id }) => id))
  const visibleLines = scene.lines.filter(({ datasetSlot }) => visibleSlots.has(datasetSlot))
  const culvertPoints = scene.culverts.flatMap(hydraulicLongitudinalCulvertPoints)
  const points = [...visibleLines.flatMap(hydraulicProfileLinePoints), ...culvertPoints]
  if (points.length === 0) return []
  const rawXMinimum = Math.min(...points.map(({ distance }) => distance))
  const rawXMaximum = Math.max(...points.map(({ distance }) => distance))
  const rawYMinimum = Math.min(...points.map(({ elevation }) => elevation))
  const rawYMaximum = Math.max(...points.map(({ elevation }) => elevation))
  const xSpan = Math.max(1, rawXMaximum - rawXMinimum)
  const ySpan = Math.max(1, rawYMaximum - rawYMinimum)
  const xMinimum = rawXMinimum - xSpan * 0.03
  const xMaximum = rawXMaximum + xSpan * 0.03
  const automaticYMinimum = rawYMinimum - ySpan * 0.12
  const automaticYMaximum = rawYMaximum + ySpan * 0.12
  const yMinimum = settings.yMinimum ?? automaticYMinimum
  const yMaximum = settings.yMaximum != null && settings.yMaximum > yMinimum
    ? settings.yMaximum
    : automaticYMaximum
  const axes = hydraulicProfileChartAxes(settings)
  const { x, y } = drawChartAxes(
    context,
    plot,
    { minimum: xMinimum, maximum: xMaximum },
    { minimum: yMinimum, maximum: yMaximum },
    axes,
    portrait ? 6 : 10,
    {
      xTick: (value) => formatLongitudinalAxisStation(value, scene.stationStart),
    },
  )

  const primaryGround = scene.grounds[0]
  const primarySurface = scene.surfaces[0]
  if (settings.showEarthFill && primaryGround) {
    drawHydraulicProfileEarthFill(context, primaryGround, x, y, plot.top + plot.height)
  }
  if (settings.showInundation && primaryGround && primarySurface) {
    drawHydraulicProfileInundation(context, primaryGround, primarySurface, x, y)
  }
  visibleLines.forEach((line) => drawHydraulicProfileLineSegments(
    context,
    hydraulicProfileLineSegments(line),
    x,
    y,
    hydraulicProfileLineStyle(settings, line.datasetSlot),
  ))
  scene.culverts.forEach((culvert) => drawHydraulicProfileLineSegments(
    context,
    [hydraulicLongitudinalCulvertPoints(culvert)],
    x,
    y,
    { color: culvert.color, width: culvert.lineWidth, dash: culvert.dash },
  ))

  context.save()
  context.font = `600 ${Math.max(13, settings.fontSize - 3)}px Arial`
  context.textAlign = 'center'
  const labelBounds: LongitudinalStationLabelBounds[] = []
  const markerLabels = layoutLongitudinalStationLabels(
    scene.markers
      .filter((marker) => marker.station >= xMinimum && marker.station <= xMaximum)
      .map((marker) => ({
          id: marker.id,
          anchorX: x(marker.station),
          width: context.measureText(marker.label).width + 14,
          height: 24,
        })),
    {
      minimumX: plot.left + 1,
      maximumX: plot.left + plot.width - 1,
      placement: settings.longitudinalStationing.labelPlacement,
      avoidOverlap: settings.longitudinalStationing.avoidLabelOverlap,
      stagger: settings.longitudinalStationing.staggerLabels,
    },
  )
  scene.markers.forEach((marker) => {
    if (marker.station < xMinimum || marker.station > xMaximum) return
    const location = x(marker.station)
    context.strokeStyle = '#7b8794'
    context.lineWidth = 1
    context.setLineDash([7, 4, 2, 4])
    context.beginPath()
    context.moveTo(location, plot.top)
    context.lineTo(location, plot.top + plot.height)
    context.stroke()
    context.setLineDash([])
    const layout = markerLabels.find(({ id }) => id === marker.id)
    if (!layout) return
    const automaticTop = layout.side === 'top'
      ? plot.top + 8 + layout.lane * (layout.height + 5)
      : plot.top + plot.height - 32 - layout.lane * (layout.height + 5)
    const width = layout.width
    const offset = settings.longitudinalStationing.labelPositions[marker.id]
      ?? { offsetX: 0, offsetY: 0 }
    const left = Math.max(
      8,
      Math.min(canvas.width - width - 8, layout.left + offset.offsetX),
    )
    const top = Math.max(
      8,
      Math.min(canvas.height - layout.height - 8, automaticTop + offset.offsetY),
    )
    const anchorY = layout.side === 'top' ? plot.top : plot.top + plot.height
    if (Math.abs(offset.offsetX) > 0.5 || Math.abs(offset.offsetY) > 0.5) {
      context.strokeStyle = '#536576'
      context.lineWidth = 1.25
      context.beginPath()
      context.moveTo(location, anchorY)
      context.lineTo(
        Math.max(left, Math.min(location, left + width)),
        Math.max(top, Math.min(anchorY, top + layout.height)),
      )
      context.stroke()
    }
    context.fillStyle = 'rgba(255,255,255,0.95)'
    context.strokeStyle = '#9aa4af'
    context.beginPath()
    context.roundRect(left, top, width, layout.height, 3)
    context.fill()
    context.stroke()
    context.fillStyle = axes.textColor
    context.textBaseline = 'middle'
    context.fillText(marker.label, left + width / 2, top + layout.height / 2)
    labelBounds.push({
      id: marker.id,
      anchorX: location,
      anchorY,
      x: left,
      y: top,
      width,
      height: layout.height,
    })
  })
  context.restore()

  drawChartLegend(
    context,
    [
      ...series.filter(({ visible }) => visible).map(({ label, style }) => ({ label, style })),
      ...scene.culverts.map((culvert) => ({
        label: culvert.name,
        style: { color: culvert.color, width: culvert.lineWidth, dash: culvert.dash },
      })),
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
    scene.conditionLabel,
  )
  return labelBounds
}
