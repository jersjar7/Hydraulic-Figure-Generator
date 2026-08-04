import type { ScalarRampKey } from '../types'

type ColorStop = readonly [number, readonly [number, number, number]]

export const SCALAR_RAMPS: Record<ScalarRampKey, readonly ColorStop[]> = {
  topography: [
    [0, [56, 144, 137]], [0.25, [181, 196, 126]],
    [0.5, [242, 215, 144]], [0.75, [196, 143, 126]],
    [1, [255, 252, 255]],
  ],
  depth: [
    [0, [194, 217, 238]], [0.25, [120, 180, 217]],
    [0.5, [57, 133, 192]], [0.75, [23, 89, 154]],
    [1, [8, 49, 108]],
  ],
  velocity: [
    [0, [0, 63, 158]], [0.25, [0, 172, 251]],
    [0.5, [0, 255, 56]], [0.75, [223, 201, 0]],
    [1, [255, 7, 0]],
  ],
  shear: [
    [0, [139, 247, 255]], [0.25, [86, 103, 255]],
    [0.5, [136, 41, 220]], [0.75, [200, 10, 163]],
    [1, [251, 0, 84]],
  ],
  waterSurface: [
    [0, [87, 65, 227]], [0.25, [86, 215, 217]],
    [0.5, [206, 214, 56]], [0.75, [219, 136, 31]],
    [1, [173, 46, 85]],
  ],
  froude: [
    [0, [179, 205, 227]], [0.25, [158, 139, 194]],
    [0.5, [179, 0, 0]], [0.75, [225, 72, 49]],
    [1, [252, 199, 134]],
  ],
  dvProduct: [
    [0, [237, 240, 134]], [0.25, [85, 149, 178]],
    [0.5, [241, 156, 108]], [0.75, [227, 117, 132]],
    [1, [197, 75, 165]],
  ],
  surcharge: [
    [0, [6, 255, 243]], [0.25, [42, 241, 42]],
    [0.5, [0, 151, 0]], [0.75, [0, 87, 0]],
    [1, [241, 3, 0]],
  ],
}

export const SCALAR_RAMP_OPTIONS: readonly {
  key: ScalarRampKey
  label: string
}[] = [
  { key: 'topography', label: 'Topography' },
  { key: 'depth', label: 'Depth' },
  { key: 'velocity', label: 'Velocity' },
  { key: 'shear', label: 'Shear' },
  { key: 'waterSurface', label: 'Water Surface' },
  { key: 'froude', label: 'Froude' },
  { key: 'dvProduct', label: 'DV Product' },
  { key: 'surcharge', label: 'Surcharge' },
]

export function scalarRampColor(key: ScalarRampKey, fraction: number) {
  const stops = SCALAR_RAMPS[key]
  const normalized = Math.max(0, Math.min(1, fraction))
  let upper = 1
  while (upper < stops.length && normalized > stops[upper][0]) upper += 1
  const [lowerPosition, lowerColor] = stops[Math.max(0, upper - 1)]
  const [upperPosition, upperColor] = stops[Math.min(stops.length - 1, upper)]
  const amount =
    upperPosition === lowerPosition
      ? 0
      : (normalized - lowerPosition) / (upperPosition - lowerPosition)
  const channels = lowerColor.map((channel, index) =>
    Math.round(channel + (upperColor[index] - channel) * amount),
  )
  return `rgb(${channels.join(',')})`
}

export function scalarColor(
  key: ScalarRampKey,
  value: number,
  minimum: number,
  maximum: number,
) {
  return scalarRampColor(key, (value - minimum) / (maximum - minimum || 1))
}

export function scalarRampGradient(key: ScalarRampKey) {
  return `linear-gradient(90deg, ${SCALAR_RAMPS[key]
    .map(([position, color]) =>
      `rgb(${color.join(',')}) ${Math.round(position * 100)}%`,
    )
    .join(', ')})`
}
