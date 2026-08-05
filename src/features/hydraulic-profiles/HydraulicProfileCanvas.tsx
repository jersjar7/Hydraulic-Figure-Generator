import { LineChart } from 'lucide-react'
import { useRef, type RefObject } from 'react'
import type { HydraulicProfileScene } from '../../core/types'
import { useFittedCanvasAspect } from '../figures/useFittedCanvasAspect'
import { HYDRAULIC_PROFILE_FRAMES } from './hydraulicProfileRenderer'

type Props = {
  scene: HydraulicProfileScene | null
  orientation: 'landscape' | 'portrait'
  canvasRef: RefObject<HTMLCanvasElement | null>
}

export function HydraulicProfileCanvas({
  scene,
  orientation,
  canvasRef,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const frame = HYDRAULIC_PROFILE_FRAMES[orientation]
  const displaySize = useFittedCanvasAspect(
    frameRef,
    frame.width / frame.height,
    10,
  )
  return (
    <>
      {!scene ? (
        <div className="map-empty">
          <div className="empty-symbol"><LineChart size={28} /></div>
          <h2>Build a hydraulic profile</h2>
          <p>Paste the SMS Summary Table and Profile Values, review the detected mapping, then generate the selected station.</p>
        </div>
      ) : null}
      <div className="map-canvas-frame" ref={frameRef}>
        <canvas
          ref={canvasRef}
          className={scene ? 'map-canvas is-visible' : 'map-canvas'}
          aria-label="Generated SMS hydraulic profile"
          style={{
            width: displaySize.width || undefined,
            height: displaySize.height || undefined,
          }}
        />
      </div>
    </>
  )
}
