import type { MapElementStyles } from './types'

const DEFAULT_BOX_STYLE = {
  background: true,
  backgroundColor: '#ffffff',
  backgroundOpacity: 0.88,
  borderColor: '#536273',
  borderWidth: 1,
} as const

export const DEFAULT_ELEMENT_STYLES: MapElementStyles = {
  title: {
    ...DEFAULT_BOX_STYLE,
    fontSize: 26,
    fontWeight: 700,
    textColor: '#0d1c31',
    alignment: 'center',
    maxWidth: 1100,
  },
  diffLegend: {
    ...DEFAULT_BOX_STYLE,
    title: 'WSE Difference',
    units: 'ft',
    orientation: 'vertical',
    fontSize: 19,
    decimalPlaces: 1,
    swatchSize: 25,
    textColor: '#0d1c31',
  },
  wetDry: {
    ...DEFAULT_BOX_STYLE,
    title: 'Wet/Dry Change',
    wetLabel: 'Newly inundated',
    dryLabel: 'Newly dry',
    orientation: 'vertical',
    fontSize: 18,
    swatchSize: 24,
    textColor: '#0d1c31',
  },
  north: {
    ...DEFAULT_BOX_STYLE,
    style: 'classic',
    size: 88,
    color: '#0c1a2d',
    showLabel: true,
    rotationMode: 'true-north',
  },
  scale: {
    ...DEFAULT_BOX_STYLE,
    lengthMode: 'auto',
    manualLength: 100,
    units: 'us-survey-ft',
    divisions: 4,
    style: 'alternating',
    decimalPlaces: 0,
    fontSize: 17,
    lineColor: '#0c1a2d',
    fillColor: '#0c1a2d',
    textColor: '#0c1a2d',
  },
}

export function cloneDefaultElementStyles() {
  return structuredClone(DEFAULT_ELEMENT_STYLES)
}

export function mergeElementStyles(
  current: MapElementStyles,
  incoming?: Partial<{
    [Key in keyof MapElementStyles]: Partial<MapElementStyles[Key]>
  }>,
) {
  if (!incoming) return current
  return {
    title: { ...current.title, ...incoming.title },
    diffLegend: { ...current.diffLegend, ...incoming.diffLegend },
    wetDry: { ...current.wetDry, ...incoming.wetDry },
    north: { ...current.north, ...incoming.north },
    scale: { ...current.scale, ...incoming.scale },
  }
}
