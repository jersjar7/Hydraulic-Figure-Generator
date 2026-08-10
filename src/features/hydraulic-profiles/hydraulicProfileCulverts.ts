import type {
  HydraulicCrossSectionCulvert,
  HydraulicCulvertKind,
  HydraulicLongitudinalCulvert,
  HydraulicProfileSection,
} from '../../core/types'

export function createDefaultCrossSectionCulvert(
  section: HydraulicProfileSection,
  kind: HydraulicCulvertKind = 'box',
): HydraulicCrossSectionCulvert {
  return {
    sectionId: section.id,
    name: kind === 'box' ? 'Box Culvert' : kind === 'arch' ? 'Arch Culvert' : kind === 'circle' ? 'Circular Culvert' : 'Ellipse Culvert',
    kind,
    scour: 0,
    bed: 2,
    center: null,
    width: 10,
    height: 6,
    span: 10,
    legHeight: 2,
    rise: 5,
    diameter: 6,
    color: '#222222',
    lineWidth: 2.5,
    dash: [],
  }
}

export function createDefaultLongitudinalCulvert(
  index: number,
  xMinimum: number,
  xMaximum: number,
  yMinimum: number,
  yMaximum: number,
): HydraulicLongitudinalCulvert {
  const xSpan = Math.max(1, xMaximum - xMinimum)
  const ySpan = Math.max(1, yMaximum - yMinimum)
  return {
    id: `longitudinal-culvert-${Date.now()}-${index}`,
    name: `Box Culvert ${index + 1}`,
    leftStation: xMinimum + xSpan * 0.42,
    rightStation: xMinimum + xSpan * 0.58,
    invertLeft: yMinimum + ySpan * 0.28,
    invertRight: yMinimum + ySpan * 0.36,
    height: Math.max(1, ySpan * 0.2),
    color: '#222222',
    lineWidth: 2.5,
    dash: [10, 6],
  }
}
