export type CrossSectionLineStyle = {
  color: string
  width: number
  dash: number[]
}

export type CrossSectionFigureSettings = {
  orientation: 'landscape' | 'portrait'
  dryDepth: number
  sampleSpacing: number
  title: string
  sectionName: string
  lookingDirection: 'downstream' | 'upstream'
  showGrid: boolean
  showLegend: boolean
  showExistingGround: boolean
  showProposedGround: boolean
  showExistingWse: boolean
  showProposedWse: boolean
  showAverageWse: boolean
  showDifferenceArrow: boolean
  existingGroundStyle: CrossSectionLineStyle
  proposedGroundStyle: CrossSectionLineStyle
  existingWseStyle: CrossSectionLineStyle
  proposedWseStyle: CrossSectionLineStyle
  arrowColor: string
  textColor: string
  fontSize: number
}

export function createDefaultCrossSectionSettings(): CrossSectionFigureSettings {
  return {
    orientation: 'landscape',
    dryDepth: 0,
    sampleSpacing: 1,
    title: '100-Year Water-Surface Elevation Comparison',
    sectionName: 'Assessment Section',
    lookingDirection: 'downstream',
    showGrid: true,
    showLegend: true,
    showExistingGround: true,
    showProposedGround: true,
    showExistingWse: true,
    showProposedWse: true,
    showAverageWse: true,
    showDifferenceArrow: true,
    existingGroundStyle: {
      color: '#b8862b',
      width: 2.5,
      dash: [12, 7],
    },
    proposedGroundStyle: {
      color: '#6f4728',
      width: 3,
      dash: [],
    },
    existingWseStyle: {
      color: '#00a2c7',
      width: 2.5,
      dash: [12, 4, 2, 4],
    },
    proposedWseStyle: {
      color: '#155da8',
      width: 2.5,
      dash: [10, 6],
    },
    arrowColor: '#c62828',
    textColor: '#17263b',
    fontSize: 18,
  }
}
