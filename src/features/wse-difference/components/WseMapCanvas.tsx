import { MapPin } from 'lucide-react'
import type {
  PointerEventHandler,
  RefObject,
} from 'react'
import type { WseDifferenceScene } from '../../../core/types'

type WseMapCanvasProps = {
  scene: WseDifferenceScene | null
  figureLabel: string
  canvasRef: RefObject<HTMLCanvasElement | null>
  canvasFrameRef: RefObject<HTMLDivElement | null>
  displaySize: { width: number; height: number }
  annotationTool: string
  annotationDragging: boolean
  assessmentCalloutDragging: boolean
  stationLabelDragging: boolean
  hoveredElement: string | null
  elementDragging: boolean
  onPointerDown: PointerEventHandler<HTMLCanvasElement>
  onPointerMove: PointerEventHandler<HTMLCanvasElement>
  onPointerUp: PointerEventHandler<HTMLCanvasElement>
  onPointerCancel: PointerEventHandler<HTMLCanvasElement>
  onPointerLeave: () => void
}

export function WseMapCanvas({
  scene,
  figureLabel,
  canvasRef,
  canvasFrameRef,
  displaySize,
  annotationTool,
  annotationDragging,
  assessmentCalloutDragging,
  stationLabelDragging,
  hoveredElement,
  elementDragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
}: WseMapCanvasProps) {
  return (
    <>
      {!scene ? (
        <div className="map-empty">
          <div className="empty-symbol">
            <MapPin size={28} />
          </div>
          <h2>Build a {figureLabel} figure</h2>
          <p>
            Add at least two scenario geometry and datasets pairs on the left,
            assign the Baseline and Comparison roles, then generate the map.
          </p>
        </div>
      ) : null}
      <div className="map-canvas-frame" ref={canvasFrameRef}>
        <canvas
          ref={canvasRef}
          className={scene ? 'map-canvas is-visible' : 'map-canvas'}
          aria-label="Generated WSE difference figure"
          data-annotation-tool={annotationTool}
          data-annotation-dragging={
            annotationDragging ? 'true' : undefined
          }
          data-assessment-callout-dragging={
            assessmentCalloutDragging ? 'true' : undefined
          }
          data-station-label-dragging={
            stationLabelDragging ? 'true' : undefined
          }
          data-element-hover={hoveredElement ?? undefined}
          data-element-dragging={elementDragging ? 'true' : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerLeave}
          style={{
            width: displaySize.width || undefined,
            height: displaySize.height || undefined,
          }}
        />
      </div>
    </>
  )
}
