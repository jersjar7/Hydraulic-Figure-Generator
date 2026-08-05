export type HydraulicProfileLineStyle = {
  color: string
  width: number
  dash: number[]
}

export type HydraulicProfileFigureSettings = {
  orientation: 'landscape' | 'portrait'
  title: string
  lookingDirection: 'downstream' | 'upstream'
  showGrid: boolean
  showLegend: boolean
  showEarthFill: boolean
  showInundation: boolean
  showThalweg: boolean
  yMinimum: number | null
  yMaximum: number | null
  fontSize: number
  textColor: string
  earthFillGroundSlot: number | null
  inundationGroundSlot: number | null
  inundationSurfaceSlot: number | null
  lineStyles: HydraulicProfileLineStyle[]
}

const LINE_COLORS = [
  '#7a5a36',
  '#1769aa',
  '#2c9c62',
  '#a63dd3',
  '#ef941a',
  '#168c9b',
  '#c0443e',
  '#6477c9',
  '#5f7d3d',
  '#7c4f9f',
  '#3f6978',
  '#9b5b3f',
  '#536f9d',
]

export function defaultHydraulicProfileLineStyle(slot: number): HydraulicProfileLineStyle {
  return {
    color: LINE_COLORS[slot % LINE_COLORS.length],
    width: slot === 0 ? 3 : 2.25,
    dash: slot >= 4 ? [10, 6] : [],
  }
}

export function hydraulicProfileLineStyle(
  settings: HydraulicProfileFigureSettings,
  slot: number,
) {
  return settings.lineStyles[slot] ?? defaultHydraulicProfileLineStyle(slot)
}

export function createDefaultHydraulicProfileSettings(): HydraulicProfileFigureSettings {
  return {
    orientation: 'landscape',
    title: 'Hydraulic Cross Section',
    lookingDirection: 'downstream',
    showGrid: true,
    showLegend: true,
    showEarthFill: true,
    showInundation: true,
    showThalweg: true,
    yMinimum: null,
    yMaximum: null,
    fontSize: 18,
    textColor: '#263746',
    earthFillGroundSlot: null,
    inundationGroundSlot: null,
    inundationSurfaceSlot: null,
    lineStyles: LINE_COLORS.map((_, slot) => defaultHydraulicProfileLineStyle(slot)),
  }
}
