import type {
  HydraulicCrossSectionCulvert,
  HydraulicLongitudinalCulvert,
  HydraulicProfileLine,
} from '../types'

export type HydraulicProfilePoint = { distance: number; elevation: number }

function validGroundPoints(ground: HydraulicProfileLine) {
  return ground.distances.flatMap((distance, index) => {
    const elevation = ground.elevations[index]
    return elevation == null || !Number.isFinite(distance) || !Number.isFinite(elevation)
      ? []
      : [{ distance, elevation }]
  })
}

export function hydraulicCrossSectionCulvertPoints(
  culvert: HydraulicCrossSectionCulvert,
  ground: HydraulicProfileLine,
): HydraulicProfilePoint[] {
  const groundPoints = validGroundPoints(ground)
  if (groundPoints.length === 0) return []
  const thalweg = groundPoints.reduce((best, point) => point.elevation < best.elevation ? point : best)
  const center = culvert.center ?? thalweg.distance
  const bottom = thalweg.elevation - culvert.scour - culvert.bed
  if (culvert.kind === 'box') {
    const half = culvert.width / 2
    return [
      { distance: center - half, elevation: bottom },
      { distance: center - half, elevation: bottom + culvert.height },
      { distance: center + half, elevation: bottom + culvert.height },
      { distance: center + half, elevation: bottom },
      { distance: center - half, elevation: bottom },
    ]
  }
  if (culvert.kind === 'arch') {
    const points: HydraulicProfilePoint[] = [{ distance: center - culvert.span / 2, elevation: bottom }]
    points.push({ distance: center - culvert.span / 2, elevation: bottom + culvert.legHeight })
    for (let index = 0; index <= 24; index += 1) {
      const angle = Math.PI - (Math.PI * index) / 24
      points.push({
        distance: center + Math.cos(angle) * culvert.span / 2,
        elevation: bottom + culvert.legHeight + Math.sin(angle) * culvert.rise,
      })
    }
    points.push({ distance: center + culvert.span / 2, elevation: bottom })
    points.push(points[0])
    return points
  }
  const width = culvert.kind === 'circle' ? culvert.diameter : culvert.width
  const height = culvert.kind === 'circle' ? culvert.diameter : culvert.height
  return Array.from({ length: 49 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 48
    return {
      distance: center + Math.cos(angle) * width / 2,
      elevation: bottom + height / 2 + Math.sin(angle) * height / 2,
    }
  })
}

export function hydraulicLongitudinalCulvertPoints(
  culvert: HydraulicLongitudinalCulvert,
): HydraulicProfilePoint[] {
  return [
    { distance: culvert.leftStation, elevation: culvert.invertLeft },
    { distance: culvert.rightStation, elevation: culvert.invertRight },
    { distance: culvert.rightStation, elevation: culvert.invertRight + culvert.height },
    { distance: culvert.leftStation, elevation: culvert.invertLeft + culvert.height },
    { distance: culvert.leftStation, elevation: culvert.invertLeft },
  ]
}
