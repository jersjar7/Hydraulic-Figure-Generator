import type {
  HydraulicCrossSectionScene,
  MapElementBounds,
} from '../../core/types'
import type {
  CrossSectionFigureSettings,
  CrossSectionLineStyle,
} from './crossSectionSettings'

export const CROSS_SECTION_FRAMES = {
  landscape: { width: 1500, height: 900 },
  portrait: { width: 1050, height: 1350 },
} as const

export type CrossSectionRenderDocument = {
  scene: HydraulicCrossSectionScene
  settings: CrossSectionFigureSettings
}

type PlotFrame = {
  left: number
  top: number
  width: number
  height: number
}

function niceStep(span: number, targetTicks: number) {
  const rough = span / Math.max(1, targetTicks)
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, 1e-6)))
  return (
    [1, 2, 5, 10].map((factor) => factor * magnitude).find(
      (candidate) => candidate >= rough,
    ) ?? 10 * magnitude
  )
}

function profileValues(
  scene: HydraulicCrossSectionScene,
  settings: CrossSectionFigureSettings,
) {
  const values: number[] = []
  for (const sample of scene.samples) {
    if (settings.showExistingGround && sample.baselineGround != null) {
      values.push(sample.baselineGround)
    }
    if (settings.showProposedGround && sample.comparisonGround != null) {
      values.push(sample.comparisonGround)
    }
    if (settings.showExistingWse && sample.baselineWse != null) {
      values.push(sample.baselineWse)
    }
    if (settings.showProposedWse && sample.comparisonWse != null) {
      values.push(sample.comparisonWse)
    }
  }
  if (scene.baselineAverage.value != null) values.push(scene.baselineAverage.value)
  if (scene.comparisonAverage.value != null) {
    values.push(scene.comparisonAverage.value)
  }
  return values
}

function drawProfile(
  context: CanvasRenderingContext2D,
  samples: HydraulicCrossSectionScene['samples'],
  value: (sample: HydraulicCrossSectionScene['samples'][number]) => number | null,
  x: (distance: number) => number,
  y: (elevation: number) => number,
  style: CrossSectionLineStyle,
) {
  context.save()
  context.strokeStyle = style.color
  context.lineWidth = style.width
  context.setLineDash(style.dash)
  context.lineJoin = 'round'
  context.lineCap = 'round'
  context.beginPath()
  let drawing = false
  for (const sample of samples) {
    const elevation = value(sample)
    if (elevation == null) {
      drawing = false
      continue
    }
    if (drawing) context.lineTo(x(sample.distance), y(elevation))
    else context.moveTo(x(sample.distance), y(elevation))
    drawing = true
  }
  context.stroke()
  context.restore()
}

function roundedBox(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.beginPath()
  context.roundRect(x, y, width, height, 5)
  context.fillStyle = 'rgba(255, 255, 255, 0.93)'
  context.fill()
  context.strokeStyle = '#a9b4c2'
  context.lineWidth = 1
  context.stroke()
}

function drawAverageLabel(
  context: CanvasRenderingContext2D,
  text: string,
  value: number,
  color: string,
  x: number,
  y: number,
  fontSize: number,
) {
  context.save()
  context.font = `600 ${fontSize}px Arial`
  const label = `${text}: ${value.toFixed(2)} ft`
  const width = context.measureText(label).width + 20
  const height = fontSize + 14
  roundedBox(context, x, y - height / 2, width, height)
  context.fillStyle = color
  context.fillText(label, x + 10, y + fontSize * 0.34)
  context.restore()
}

function drawDifferenceArrow(
  context: CanvasRenderingContext2D,
  scene: HydraulicCrossSectionScene,
  x: number,
  y: (elevation: number) => number,
  color: string,
  fontSize: number,
) {
  const baseline = scene.baselineAverage.value
  const comparison = scene.comparisonAverage.value
  if (baseline == null || comparison == null) return
  const yBaseline = y(baseline)
  const yComparison = y(comparison)
  const top = Math.min(yBaseline, yComparison)
  const bottom = Math.max(yBaseline, yComparison)
  const head = 9

  context.save()
  context.strokeStyle = color
  context.fillStyle = color
  context.lineWidth = 3
  context.beginPath()
  context.moveTo(x, top)
  context.lineTo(x, bottom)
  context.stroke()
  context.beginPath()
  context.moveTo(x, top)
  context.lineTo(x - head, top + head)
  context.lineTo(x + head, top + head)
  context.closePath()
  context.fill()
  context.beginPath()
  context.moveTo(x, bottom)
  context.lineTo(x - head, bottom - head)
  context.lineTo(x + head, bottom - head)
  context.closePath()
  context.fill()

  const difference = comparison - baseline
  const description =
    difference < 0 ? '100-Year WSE Drop' : difference > 0 ? '100-Year WSE Rise' : 'No WSE Change'
  const lines = [description, `${Math.abs(difference).toFixed(2)} ft`]
  context.font = `700 ${fontSize}px Arial`
  const width = Math.max(...lines.map((line) => context.measureText(line).width)) + 18
  const height = fontSize * 2 + 15
  const labelX = x + 14
  const labelY = (top + bottom) / 2 - height / 2
  roundedBox(context, labelX, labelY, width, height)
  context.fillStyle = color
  context.fillText(lines[0], labelX + 9, labelY + fontSize + 1)
  context.fillText(lines[1], labelX + 9, labelY + fontSize * 2 + 3)
  context.restore()
}

function drawLegend(
  context: CanvasRenderingContext2D,
  frame: PlotFrame,
  settings: CrossSectionFigureSettings,
) {
  const entries = [
    settings.showExistingGround
      ? ['Existing Ground', settings.existingGroundStyle]
      : null,
    settings.showProposedGround
      ? ['Proposed Ground', settings.proposedGroundStyle]
      : null,
    settings.showExistingWse
      ? ['Existing 100-Year WSE', settings.existingWseStyle]
      : null,
    settings.showProposedWse
      ? ['Proposed 100-Year WSE', settings.proposedWseStyle]
      : null,
  ].filter(Boolean) as [string, CrossSectionLineStyle][]
  if (entries.length === 0) return

  const fontSize = Math.max(14, settings.fontSize - 2)
  context.save()
  context.font = `${fontSize}px Arial`
  const width =
    Math.max(...entries.map(([label]) => context.measureText(label).width)) + 72
  const height = entries.length * (fontSize + 12) + 18
  const left = frame.left + frame.width - width - 16
  const top = frame.top + 16
  roundedBox(context, left, top, width, height)
  entries.forEach(([label, style], index) => {
    const y = top + 20 + index * (fontSize + 12)
    context.strokeStyle = style.color
    context.lineWidth = style.width
    context.setLineDash(style.dash)
    context.beginPath()
    context.moveTo(left + 12, y)
    context.lineTo(left + 48, y)
    context.stroke()
    context.setLineDash([])
    context.fillStyle = settings.textColor
    context.fillText(label, left + 57, y + fontSize * 0.32)
  })
  context.restore()
}

export function renderCrossSectionDocument(
  canvas: HTMLCanvasElement,
  document: CrossSectionRenderDocument,
): MapElementBounds[] {
  const { scene, settings } = document
  const frameSize = CROSS_SECTION_FRAMES[settings.orientation]
  canvas.width = frameSize.width
  canvas.height = frameSize.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas rendering is unavailable.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)

  const portrait = settings.orientation === 'portrait'
  const plot: PlotFrame = {
    left: portrait ? 105 : 120,
    top: portrait ? 150 : 120,
    width: canvas.width - (portrait ? 165 : 200),
    height: canvas.height - (portrait ? 300 : 240),
  }
  const maximumDistance = Math.max(
    1,
    scene.samples.at(-1)?.distance ?? 1,
  )
  const values = profileValues(scene, settings)
  const rawMinimum = values.length > 0 ? Math.min(...values) : 0
  const rawMaximum = values.length > 0 ? Math.max(...values) : 1
  const elevationSpan = Math.max(rawMaximum - rawMinimum, 1)
  const elevationMinimum = rawMinimum - elevationSpan * 0.12
  const elevationMaximum = rawMaximum + elevationSpan * 0.12
  const x = (distance: number) =>
    plot.left + (distance / maximumDistance) * plot.width
  const y = (elevation: number) =>
    plot.top +
    ((elevationMaximum - elevation) /
      (elevationMaximum - elevationMinimum)) *
      plot.height

  context.save()
  context.fillStyle = '#fbfcfd'
  context.fillRect(plot.left, plot.top, plot.width, plot.height)
  context.strokeStyle = '#263746'
  context.lineWidth = 1.5
  context.strokeRect(plot.left, plot.top, plot.width, plot.height)

  const distanceStep = niceStep(maximumDistance, portrait ? 6 : 10)
  const elevationStep = niceStep(elevationMaximum - elevationMinimum, 8)
  context.font = `${settings.fontSize}px Arial`
  context.fillStyle = settings.textColor
  context.textAlign = 'center'
  context.textBaseline = 'top'
  for (
    let distance = Math.ceil(0 / distanceStep) * distanceStep;
    distance <= maximumDistance + distanceStep * 0.01;
    distance += distanceStep
  ) {
    const location = x(distance)
    if (settings.showGrid) {
      context.strokeStyle = '#dbe1e7'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(location, plot.top)
      context.lineTo(location, plot.top + plot.height)
      context.stroke()
    }
    context.fillStyle = settings.textColor
    context.fillText(distance.toFixed(distanceStep < 1 ? 1 : 0), location, plot.top + plot.height + 12)
  }
  context.textAlign = 'right'
  context.textBaseline = 'middle'
  for (
    let elevation = Math.ceil(elevationMinimum / elevationStep) * elevationStep;
    elevation <= elevationMaximum + elevationStep * 0.01;
    elevation += elevationStep
  ) {
    const location = y(elevation)
    if (settings.showGrid) {
      context.strokeStyle = '#dbe1e7'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(plot.left, location)
      context.lineTo(plot.left + plot.width, location)
      context.stroke()
    }
    context.fillStyle = settings.textColor
    context.fillText(
      elevation.toFixed(elevationStep < 1 ? 1 : 0),
      plot.left - 12,
      location,
    )
  }
  context.restore()

  if (settings.showExistingGround) {
    drawProfile(
      context,
      scene.samples,
      (sample) => sample.baselineGround,
      x,
      y,
      settings.existingGroundStyle,
    )
  }
  if (settings.showProposedGround) {
    drawProfile(
      context,
      scene.samples,
      (sample) => sample.comparisonGround,
      x,
      y,
      settings.proposedGroundStyle,
    )
  }
  if (settings.showExistingWse) {
    drawProfile(
      context,
      scene.samples,
      (sample) => sample.baselineWse,
      x,
      y,
      settings.existingWseStyle,
    )
  }
  if (settings.showProposedWse) {
    drawProfile(
      context,
      scene.samples,
      (sample) => sample.comparisonWse,
      x,
      y,
      settings.proposedWseStyle,
    )
  }

  if (settings.showAverageWse) {
    const averages = [
      {
        average: scene.baselineAverage,
        label: 'Avg. Existing WSE',
        color: settings.existingWseStyle.color,
        labelX: plot.left + 18,
      },
      {
        average: scene.comparisonAverage,
        label: 'Avg. Proposed WSE',
        color: settings.proposedWseStyle.color,
        labelX: plot.left + 18,
      },
    ]
    for (const item of averages) {
      if (item.average.value == null) continue
      const start = item.average.wetStart ?? 0
      const end = item.average.wetEnd ?? maximumDistance
      context.save()
      context.strokeStyle = item.color
      context.lineWidth = 4
      context.setLineDash([])
      context.beginPath()
      context.moveTo(x(start), y(item.average.value))
      context.lineTo(x(end), y(item.average.value))
      context.stroke()
      context.restore()
      drawAverageLabel(
        context,
        item.label,
        item.average.value,
        item.color,
        item.labelX,
        y(item.average.value),
        Math.max(14, settings.fontSize - 2),
      )
    }
  }

  if (settings.showDifferenceArrow) {
    drawDifferenceArrow(
      context,
      scene,
      plot.left + plot.width * 0.68,
      y,
      settings.arrowColor,
      Math.max(14, settings.fontSize - 2),
    )
  }
  if (settings.showLegend) drawLegend(context, plot, settings)

  context.save()
  context.fillStyle = settings.textColor
  context.textAlign = 'center'
  context.font = `700 ${settings.fontSize + 8}px Arial`
  context.fillText(settings.title, canvas.width / 2, 45)
  context.font = `${settings.fontSize + 2}px Arial`
  context.fillText('Distance (feet)', plot.left + plot.width / 2, plot.top + plot.height + 58)
  context.translate(35, plot.top + plot.height / 2)
  context.rotate(-Math.PI / 2)
  context.fillText('Elevation (feet)', 0, 0)
  context.restore()

  context.save()
  context.font = `600 ${Math.max(14, settings.fontSize - 2)}px Arial`
  const direction = `Cross section is looking ${settings.lookingDirection}`
  const sectionText = settings.sectionName || scene.line.label
  const infoWidth = Math.max(
    context.measureText(sectionText).width,
    context.measureText(direction).width,
  ) + 26
  const infoHeight = settings.fontSize * 2 + 26
  const infoX = plot.left + plot.width - infoWidth - 14
  const infoY = plot.top + plot.height - infoHeight - 14
  roundedBox(context, infoX, infoY, infoWidth, infoHeight)
  context.fillStyle = settings.textColor
  context.fillText(sectionText, infoX + 13, infoY + settings.fontSize + 1)
  context.font = `${Math.max(13, settings.fontSize - 3)}px Arial`
  context.fillText(direction, infoX + 13, infoY + settings.fontSize * 2 + 5)
  context.restore()

  return []
}
