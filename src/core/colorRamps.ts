export type RgbColor = readonly [number, number, number]
export type ColorRampStop = readonly [position: number, color: RgbColor]

export const SCALAR_COLOR_RAMP_KEYS = [
  'topography',
  'depth',
  'velocity',
  'shear',
  'waterSurface',
  'froude',
  'dvProduct',
  'surcharge',
] as const

export type ScalarColorRampKey = (typeof SCALAR_COLOR_RAMP_KEYS)[number]
export type ColorRampKey = ScalarColorRampKey | 'wseDifference'

export type ColorRampDefinition = {
  key: ColorRampKey
  label: string
  source: 'WSDOT' | 'SMS/FHWA'
  stops: readonly ColorRampStop[]
}

export const COLOR_RAMP_CATALOG: Record<ColorRampKey, ColorRampDefinition> = {
  wseDifference: {
    key: 'wseDifference',
    label: 'WSE Difference',
    source: 'WSDOT',
    stops: [
      [0, [0, 31, 176]],
      [0.25, [99, 169, 213]],
      [0.48, [236, 245, 248]],
      [0.52, [255, 255, 210]],
      [0.75, [246, 173, 55]],
      [1, [197, 32, 32]],
    ],
  },
  topography: {
    key: 'topography',
    label: 'Topography',
    source: 'SMS/FHWA',
    stops: [
      [0, [56, 144, 137]], [0.125, [155, 185, 122]],
      [0.25, [181, 196, 126]], [0.375, [244, 232, 158]],
      [0.5, [242, 215, 144]], [0.625, [225, 184, 133]],
      [0.75, [196, 143, 126]], [0.875, [229, 200, 200]],
      [1, [255, 252, 255]],
    ],
  },
  depth: {
    key: 'depth',
    label: 'Depth',
    source: 'SMS/FHWA',
    stops: [
      [0, [194, 217, 238]], [0.125, [157, 198, 227]],
      [0.25, [120, 180, 217]], [0.375, [87, 158, 205]],
      [0.5, [57, 133, 192]], [0.625, [31, 109, 176]],
      [0.75, [23, 89, 154]], [0.875, [16, 69, 131]],
      [1, [8, 49, 108]],
    ],
  },
  velocity: {
    key: 'velocity',
    label: 'Velocity',
    source: 'SMS/FHWA',
    stops: [
      [0, [0, 63, 158]], [0.125, [0, 38, 255]],
      [0.25, [0, 172, 251]], [0.375, [0, 242, 181]],
      [0.5, [0, 255, 56]], [0.625, [122, 255, 0]],
      [0.75, [223, 201, 0]], [0.875, [255, 113, 0]],
      [1, [255, 7, 0]],
    ],
  },
  shear: {
    key: 'shear',
    label: 'Shear',
    source: 'SMS/FHWA',
    stops: [
      [0, [139, 247, 255]], [0.125, [112, 175, 255]],
      [0.25, [86, 103, 255]], [0.375, [100, 62, 241]],
      [0.5, [136, 41, 220]], [0.625, [172, 19, 198]],
      [0.75, [200, 10, 163]], [0.875, [225, 5, 124]],
      [1, [251, 0, 84]],
    ],
  },
  waterSurface: {
    key: 'waterSurface',
    label: 'Water Surface',
    source: 'SMS/FHWA',
    stops: [
      [0, [87, 65, 227]], [0.125, [85, 142, 224]],
      [0.25, [86, 215, 217]], [0.375, [146, 214, 136]],
      [0.5, [206, 214, 56]], [0.625, [212, 175, 43]],
      [0.75, [219, 136, 31]], [0.875, [197, 92, 57]],
      [1, [173, 46, 85]],
    ],
  },
  froude: {
    key: 'froude',
    label: 'Froude',
    source: 'SMS/FHWA',
    stops: [
      [0, [179, 205, 227]], [0.125, [170, 178, 213]],
      [0.25, [158, 139, 194]], [0.375, [146, 100, 174]],
      [0.5, [179, 0, 0]], [0.625, [202, 36, 24]],
      [0.75, [225, 72, 49]], [0.875, [239, 134, 91]],
      [1, [252, 199, 134]],
    ],
  },
  dvProduct: {
    key: 'dvProduct',
    label: 'DV Product',
    source: 'SMS/FHWA',
    stops: [
      [0, [237, 240, 134]], [0.125, [130, 165, 113]],
      [0.25, [85, 149, 178]], [0.375, [143, 149, 159]],
      [0.5, [241, 156, 108]], [0.625, [242, 138, 115]],
      [0.75, [227, 117, 132]], [0.875, [212, 97, 148]],
      [1, [197, 75, 165]],
    ],
  },
  surcharge: {
    key: 'surcharge',
    label: 'Surcharge',
    source: 'SMS/FHWA',
    stops: [
      [0, [6, 255, 243]], [0.125, [73, 255, 123]],
      [0.25, [42, 241, 42]], [0.375, [0, 208, 0]],
      [0.5, [0, 151, 0]], [0.625, [0, 119, 0]],
      [0.75, [0, 87, 0]], [0.875, [50, 51, 0]],
      [1, [241, 3, 0]],
    ],
  },
}

export const COLOR_RAMP_OPTIONS = Object.values(COLOR_RAMP_CATALOG)
export const SCALAR_COLOR_RAMP_OPTIONS = SCALAR_COLOR_RAMP_KEYS.map(
  (key) => COLOR_RAMP_CATALOG[key],
)

export const DEFAULT_COLOR_RAMP_BY_USE = {
  wseDifference: 'wseDifference',
  topography: 'topography',
  depth: 'depth',
  velocity: 'velocity',
  shear: 'shear',
  waterSurface: 'waterSurface',
  froude: 'froude',
  dvProduct: 'dvProduct',
  surcharge: 'surcharge',
} as const satisfies Record<string, ColorRampKey>

export function colorRampColor(key: ColorRampKey, fraction: number) {
  const stops = COLOR_RAMP_CATALOG[key].stops
  const normalized = Math.max(0, Math.min(1, fraction))
  let upper = 1
  while (upper < stops.length && normalized > stops[upper][0]) upper += 1
  const [lowerPosition, lowerColor] = stops[Math.max(0, upper - 1)]
  const [upperPosition, upperColor] = stops[Math.min(stops.length - 1, upper)]
  const amount = upperPosition === lowerPosition
    ? 0
    : (normalized - lowerPosition) / (upperPosition - lowerPosition)
  const channels = lowerColor.map((channel, index) =>
    Math.round(channel + (upperColor[index] - channel) * amount),
  )
  return `rgb(${channels.join(',')})`
}

export function colorRampGradient(key: ColorRampKey) {
  return `linear-gradient(90deg, ${COLOR_RAMP_CATALOG[key].stops
    .map(([position, color]) =>
      `rgb(${color.join(',')}) ${Math.round(position * 100)}%`,
    )
    .join(', ')})`
}
