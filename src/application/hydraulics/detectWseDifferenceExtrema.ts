import { findWseDifferenceExtrema } from '../../core/hydraulicEngine'
import type { WseDifferenceScene } from '../../core/types'

export function detectWseDifferenceExtrema(scene: WseDifferenceScene) {
  return findWseDifferenceExtrema(scene)
}
