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
  groundStyle: HydraulicProfileLineStyle
  surfaceStyles: HydraulicProfileLineStyle[]
}

const SURFACE_COLORS = [
  '#1769aa',
  '#2c9c62',
  '#a63dd3',
  '#ef941a',
  '#168c9b',
  '#c0443e',
  '#6477c9',
  '#5f7d3d',
]

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
    groundStyle: { color: '#7a5a36', width: 3, dash: [] },
    surfaceStyles: SURFACE_COLORS.map((color, index) => ({
      color,
      width: 2.25,
      dash: index >= 3 ? [10, 6] : [],
    })),
  }
}
