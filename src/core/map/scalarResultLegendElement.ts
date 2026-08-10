import type {
  DifferenceLegendElementStyle,
  MapElementPositions,
  ScalarRampKey,
} from '../types'
import { scalarRampColor } from './scalarResultRamp'
import { drawNumericLegend } from './numericLegendElement'
import type { MapFrame } from './view'

type ScalarLegendOptions = {
  minimum: number
  maximum: number
  bandCount: number
  ramp: ScalarRampKey
  title: string
  units: string
}

function label(value: number, decimals: number) {
  return value.toFixed(Math.max(0, Math.min(4, decimals)))
}

export function drawScalarResultLegend(
  context: CanvasRenderingContext2D,
  options: ScalarLegendOptions,
  frame: MapFrame,
  position: MapElementPositions['diffLegend'],
  style: DifferenceLegendElementStyle,
) {
  const title = options.units
    ? `${options.title} (${options.units})`
    : options.title
  const labels = Array.from(
    { length: options.bandCount + 1 },
    (_, index) =>
      label(
        options.minimum +
          (index * (options.maximum - options.minimum)) /
            options.bandCount,
        style.decimalPlaces,
      ),
  )
  return drawNumericLegend(
    context,
    {
      title,
      labels,
      bandCount: options.bandCount,
      colorForBand: (band) =>
        scalarRampColor(
          options.ramp,
          (band + 0.5) / options.bandCount,
        ),
    },
    frame,
    position,
    style,
  )
}
