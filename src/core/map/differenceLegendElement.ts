import type {
  ColorRampKey,
} from '../colorRamps'
import type {
  DifferenceLegendElementStyle,
  MapElementPositions,
} from '../types'
import { differenceBandCount, differenceColor } from './hydraulicLayers'
import { drawNumericLegend } from './numericLegendElement'
import type { MapFrame } from './view'

function formatLegendValue(value: number, decimalPlaces: number) {
  return value.toFixed(Math.max(0, Math.min(3, decimalPlaces)))
}

function legendTitle(style: DifferenceLegendElementStyle) {
  const title = style.title.trim()
  const units = style.units.trim()
  return units ? `${title} (${units})` : title
}

export function drawDifferenceLegend(
  context: CanvasRenderingContext2D,
  maxAbsolute: number,
  interval: number | null,
  ramp: ColorRampKey,
  frame: MapFrame,
  position: MapElementPositions['diffLegend'],
  style: DifferenceLegendElementStyle,
) {
  const bandCount = differenceBandCount(maxAbsolute, interval)
  const title = legendTitle(style)
  const labels = Array.from({ length: bandCount + 1 }, (_, index) =>
    formatLegendValue(
      -maxAbsolute + (index * 2 * maxAbsolute) / bandCount,
      style.decimalPlaces,
    ),
  )
  return drawNumericLegend(
    context,
    {
      title,
      labels,
      bandCount,
      colorForBand: (band) => {
        const middle =
          -maxAbsolute + ((band + 0.5) * 2 * maxAbsolute) / bandCount
        return differenceColor(middle, maxAbsolute, ramp) ?? '#fff'
      },
    },
    frame,
    position,
    style,
  )
}
