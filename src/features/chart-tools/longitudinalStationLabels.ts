import type {
  LongitudinalStationLabelPlacement,
  LongitudinalStationLabelPosition,
} from '../../core/types'

export type LongitudinalStationLabelInput = {
  id: string
  anchorX: number
  width: number
  height: number
}

export type LongitudinalStationLabelLayout = LongitudinalStationLabelInput & {
  left: number
  side: 'top' | 'bottom'
  lane: number
}

export type LongitudinalStationLabelBounds = {
  id: string
  anchorX: number
  anchorY: number
  x: number
  y: number
  width: number
  height: number
}

export function positionLongitudinalStationLabel(
  positions: Readonly<Record<string, LongitudinalStationLabelPosition>>,
  id: string,
  position: LongitudinalStationLabelPosition,
) {
  return {
    ...positions,
    [id]: position,
  }
}

export function layoutLongitudinalStationLabels(
  labels: readonly LongitudinalStationLabelInput[],
  {
    minimumX,
    maximumX,
    placement,
    avoidOverlap,
    stagger,
    gap = 6,
  }: {
    minimumX: number
    maximumX: number
    placement: LongitudinalStationLabelPlacement
    avoidOverlap: boolean
    stagger: boolean
    gap?: number
  },
): LongitudinalStationLabelLayout[] {
  const laneRights = {
    top: [] as number[],
    bottom: [] as number[],
  }

  return [...labels]
    .sort((left, right) => left.anchorX - right.anchorX)
    .map((label, index) => {
      const side = placement === 'auto'
        ? index % 2 === 0 ? 'top' : 'bottom'
        : placement
      const horizontalDirection = [-1, 1, 1, -1][index % 4]
      const horizontalOffset = stagger
        ? horizontalDirection * Math.min(18, label.width * 0.3)
        : 0
      const left = Math.max(
        minimumX,
        Math.min(
          label.anchorX - label.width / 2 + horizontalOffset,
          maximumX - label.width,
        ),
      )
      let lane = 0
      if (avoidOverlap) {
        lane = laneRights[side].findIndex((right) => left >= right + gap)
        if (lane < 0) lane = laneRights[side].length
        laneRights[side][lane] = left + label.width
      }
      return { ...label, left, side, lane }
    })
}
