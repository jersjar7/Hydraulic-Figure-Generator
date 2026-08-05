import type {
  HydraulicProfileLine,
  HydraulicProfileScene,
  MapElementBounds,
} from '../../core/types'
import type {
  HydraulicProfileFigureSettings,
  HydraulicProfileLineStyle,
} from './hydraulicProfileSettings'

export const HYDRAULIC_PROFILE_FRAMES = {
  landscape: { width: 1500, height: 900 },
  portrait: { width: 1050, height: 1350 },
} as const

export type HydraulicProfileRenderDocument = {
  scene: HydraulicProfileScene
  settings: HydraulicProfileFigureSettings
}

type PlotFrame = { left: number; top: number; width: number; height: number }

function niceStep(span: number, targetTicks: number) {
  const rough = span / Math.max(1, targetTicks)
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, 1e-6)))
  return [1, 2, 5, 10]
    .map((factor) => factor * magnitude)
    .find((candidate) => candidate >= rough) ?? 10 * magnitude
}

function linePoints(line: HydraulicProfileLine) {
  return line.distances.flatMap((distance, index) => {
    const elevation = line.elevations[index]
    return elevation == null ? [] : [{ distance, elevation }]
  })
}

function interpolate(line: HydraulicProfileLine, distance: number) {
  for (let index = 1; index < line.distances.length; index += 1) {
    const leftDistance = line.distances[index - 1]
    const rightDistance = line.distances[index]
    const leftElevation = line.elevations[index - 1]
    const rightElevation = line.elevations[index]
    if (
      distance < Math.min(leftDistance, rightDistance) ||
      distance > Math.max(leftDistance, rightDistance) ||
      leftElevation == null ||
      rightElevation == null
    ) continue
    const fraction = rightDistance === leftDistance
      ? 0
      : (distance - leftDistance) / (rightDistance - leftDistance)
    return leftElevation + (rightElevation - leftElevation) * fraction
  }
  return null
}

function drawLine(
  context: CanvasRenderingContext2D,
  line: HydraulicProfileLine,
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
  let drawing = false
  line.distances.forEach((distance, index) => {
    const elevation = line.elevations[index]
    if (elevation == null) {
      drawing = false
      return
    }
    if (drawing) context.lineTo(x(distance), y(elevation))
    else context.moveTo(x(distance), y(elevation))
    drawing = true
  })
  context.stroke()
  context.restore()
}

function drawEarthFill(
  context: CanvasRenderingContext2D,
  ground: HydraulicProfileLine,
  x: (value: number) => number,
  y: (value: number) => number,
  bottom: number,
) {
  const points = linePoints(ground)
  if (points.length < 2) return
  context.save()
  context.fillStyle = '#eee6da'
  context.beginPath()
  context.moveTo(x(points[0].distance), bottom)
  points.forEach((point) => context.lineTo(x(point.distance), y(point.elevation)))
  context.lineTo(x(points.at(-1)!.distance), bottom)
  context.closePath()
  context.fill()
  context.restore()
}

function drawInundation(
  context: CanvasRenderingContext2D,
  ground: HydraulicProfileLine,
  surface: HydraulicProfileLine | undefined,
  x: (value: number) => number,
  y: (value: number) => number,
) {
  if (!surface) return
  const wet = linePoints(surface).flatMap((point) => {
    const groundElevation = interpolate(ground, point.distance)
    return groundElevation != null && point.elevation > groundElevation
      ? [{ ...point, groundElevation }]
      : []
  })
  if (wet.length < 2) return
  context.save()
  context.fillStyle = 'rgba(54, 145, 209, 0.22)'
  context.beginPath()
  wet.forEach((point, index) => {
    if (index === 0) context.moveTo(x(point.distance), y(point.elevation))
    else context.lineTo(x(point.distance), y(point.elevation))
  })
  for (let index = wet.length - 1; index >= 0; index -= 1) {
    const point = wet[index]
    context.lineTo(x(point.distance), y(point.groundElevation))
  }
  context.closePath()
  context.fill()
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

function drawLegend(
  context: CanvasRenderingContext2D,
  scene: HydraulicProfileScene,
  settings: HydraulicProfileFigureSettings,
  plot: PlotFrame,
) {
  const entries = [
    { name: scene.section.ground.name, style: settings.groundStyle },
    ...scene.section.surfaces.map((surface, index) => ({
      name: surface.name,
      style: settings.surfaceStyles[index % settings.surfaceStyles.length],
    })),
  ]
  const fontSize = Math.max(14, settings.fontSize - 2)
  context.save()
  context.font = `${fontSize}px Arial`
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  const width = Math.max(...entries.map((entry) => context.measureText(entry.name).width)) + 72
  const height = entries.length * (fontSize + 11) + 18
  const left = plot.left + plot.width - width - 15
  const top = plot.top + 15
  roundedBox(context, left, top, width, height)
  entries.forEach((entry, index) => {
    const location = top + 20 + index * (fontSize + 11)
    context.strokeStyle = entry.style.color
    context.lineWidth = entry.style.width
    context.setLineDash(entry.style.dash)
    context.beginPath()
    context.moveTo(left + 12, location)
    context.lineTo(left + 48, location)
    context.stroke()
    context.setLineDash([])
    context.fillStyle = settings.textColor
    context.fillText(entry.name, left + 57, location)
  })
  context.restore()
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
  const plot: PlotFrame = {
    left: portrait ? 105 : 120,
    top: portrait ? 165 : 135,
    width: canvas.width - (portrait ? 165 : 200),
    height: canvas.height - (portrait ? 315 : 255),
  }
  const lines = [scene.section.ground, ...scene.section.surfaces]
  const points = lines.flatMap(linePoints)
  const rawXMinimum = Math.min(...points.map((point) => point.distance))
  const rawXMaximum = Math.max(...points.map((point) => point.distance))
  const rawYMinimum = Math.min(...points.map((point) => point.elevation))
  const rawYMaximum = Math.max(...points.map((point) => point.elevation))
  const xSpan = Math.max(rawXMaximum - rawXMinimum, 1)
  const ySpan = Math.max(rawYMaximum - rawYMinimum, 1)
  const xMinimum = rawXMinimum - xSpan * 0.03
  const xMaximum = rawXMaximum + xSpan * 0.03
  const yMinimum = settings.yMinimum ?? rawYMinimum - ySpan * 0.16
  const yMaximum = settings.yMaximum ?? rawYMaximum + ySpan * 0.12
  const x = (value: number) => plot.left + ((value - xMinimum) / (xMaximum - xMinimum)) * plot.width
  const y = (value: number) => plot.top + ((yMaximum - value) / (yMaximum - yMinimum)) * plot.height

  context.fillStyle = '#fbfcfd'
  context.fillRect(plot.left, plot.top, plot.width, plot.height)
  const xStep = niceStep(xMaximum - xMinimum, portrait ? 6 : 10)
  const yStep = niceStep(yMaximum - yMinimum, 8)
  context.font = `${settings.fontSize}px Arial`
  context.fillStyle = settings.textColor
  context.textAlign = 'center'
  context.textBaseline = 'top'
  for (let value = Math.ceil(xMinimum / xStep) * xStep; value <= xMaximum; value += xStep) {
    const location = x(value)
    if (settings.showGrid) {
      context.strokeStyle = '#dde2e8'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(location, plot.top)
      context.lineTo(location, plot.top + plot.height)
      context.stroke()
    }
    context.fillStyle = settings.textColor
    context.fillText(value.toFixed(xStep < 1 ? 1 : 0), location, plot.top + plot.height + 12)
  }
  context.textAlign = 'right'
  context.textBaseline = 'middle'
  for (let value = Math.ceil(yMinimum / yStep) * yStep; value <= yMaximum; value += yStep) {
    const location = y(value)
    if (settings.showGrid) {
      context.strokeStyle = '#dde2e8'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(plot.left, location)
      context.lineTo(plot.left + plot.width, location)
      context.stroke()
    }
    context.fillStyle = settings.textColor
    context.fillText(value.toFixed(yStep < 1 ? 1 : 0), plot.left - 12, location)
  }
  context.strokeStyle = '#334455'
  context.lineWidth = 1.5
  context.strokeRect(plot.left, plot.top, plot.width, plot.height)

  if (settings.showEarthFill) drawEarthFill(context, scene.section.ground, x, y, plot.top + plot.height)
  if (settings.showInundation) drawInundation(context, scene.section.ground, scene.section.surfaces[0], x, y)
  drawLine(context, scene.section.ground, x, y, settings.groundStyle)
  scene.section.surfaces.forEach((surface, index) =>
    drawLine(context, surface, x, y, settings.surfaceStyles[index % settings.surfaceStyles.length]),
  )

  if (settings.showThalweg) {
    const groundPoints = linePoints(scene.section.ground)
    const thalweg = groundPoints.reduce((best, point) => point.elevation < best.elevation ? point : best)
    context.save()
    context.fillStyle = settings.groundStyle.color
    context.beginPath()
    context.arc(x(thalweg.distance), y(thalweg.elevation), 5, 0, Math.PI * 2)
    context.fill()
    context.font = `600 ${Math.max(13, settings.fontSize - 3)}px Arial`
    context.textAlign = 'center'
    context.fillText(`Thalweg ${thalweg.elevation.toFixed(2)}`, x(thalweg.distance), y(thalweg.elevation) + 22)
    context.restore()
  }
  if (settings.showLegend) drawLegend(context, scene, settings, plot)

  context.save()
  context.fillStyle = settings.textColor
  context.textAlign = 'center'
  context.font = `700 ${settings.fontSize + 8}px Arial`
  context.fillText(settings.title, canvas.width / 2, 43)
  context.font = `600 ${settings.fontSize + 1}px Arial`
  context.fillText(`Station ${scene.section.stationLabel}`, canvas.width / 2, 78)
  context.font = `${settings.fontSize + 2}px Arial`
  context.fillText('Distance (feet)', plot.left + plot.width / 2, plot.top + plot.height + 58)
  context.translate(35, plot.top + plot.height / 2)
  context.rotate(-Math.PI / 2)
  context.fillText('Elevation (feet, NAVD88)', 0, 0)
  context.restore()

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
