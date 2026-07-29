import type {
  MapCoordinate,
  WseDifferenceScene,
  WseExtremumKind,
} from '../types'

const isValidResult = (value: number) =>
  value != null && Number.isFinite(value) && value > -900

export type WseDifferenceExtremum = {
  kind: WseExtremumKind
  index: number
  value: number
  point: MapCoordinate
}

export type WseDifferenceExtrema = {
  rise: WseDifferenceExtremum | null
  reduction: WseDifferenceExtremum | null
}

export function findWseDifferenceExtrema(
  scene: WseDifferenceScene,
): WseDifferenceExtrema {
  let riseIndex = -1
  let riseValue = 0
  let reductionIndex = -1
  let reductionValue = 0

  for (let index = 0; index < scene.diff.length; index += 1) {
    const value = scene.diff[index]
    if (!isValidResult(value)) continue
    if (value > riseValue) {
      riseValue = value
      riseIndex = index
    }
    if (value < reductionValue) {
      reductionValue = value
      reductionIndex = index
    }
  }

  const result = (
    kind: WseExtremumKind,
    index: number,
    value: number,
  ): WseDifferenceExtremum | null =>
    index < 0
      ? null
      : {
          kind,
          index,
          value,
          point: {
            x: scene.projected.mx[index],
            y: scene.projected.my[index],
          },
        }

  return {
    rise: result('max-rise', riseIndex, riseValue),
    reduction: result('max-reduction', reductionIndex, reductionValue),
  }
}

export function formatWseExtremumLabel(
  kind: WseExtremumKind,
  value: number,
) {
  const label = kind === 'max-rise' ? 'Max WSE rise' : 'Max WSE reduction'
  const sign = value > 0 ? '+' : ''
  return `${label}: ${sign}${value.toFixed(2)} ft`
}
