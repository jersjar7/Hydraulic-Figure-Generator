import { Layers3 } from 'lucide-react'
import type { RefObject } from 'react'
import type { PointerEventHandler } from 'react'
import type {
  AnnotationTool,
  MapElementKey,
  PlanViewResultScene,
} from '../../core/types'

type Props = {
  scene: PlanViewResultScene | null
  canvasRef: RefObject<HTMLCanvasElement | null>
  canvasFrameRef: RefObject<HTMLDivElement | null>
  displaySize: { width: number; height: number }
  stationLabelDragging: boolean
  elementDragging: boolean
  hoveredElement: MapElementKey | null
  annotationTool: AnnotationTool
  onPointerDown: PointerEventHandler<HTMLCanvasElement>
  onPointerMove: PointerEventHandler<HTMLCanvasElement>
  onPointerUp: PointerEventHandler<HTMLCanvasElement>
  onPointerCancel: PointerEventHandler<HTMLCanvasElement>
  onPointerLeave: PointerEventHandler<HTMLCanvasElement>
}

export function PlanViewResultCanvas({
  scene,
  canvasRef,
  canvasFrameRef,
  displaySize,
  stationLabelDragging,
  elementDragging,
  hoveredElement,
  annotationTool,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
}: Props) {
  return (
    <>
      {!scene ? (
        <div className="map-empty">
          <div className="empty-symbol"><Layers3 size={28} /></div>
          <h2>Build a plan-view result map</h2>
          <p>
            Add SMS geometry, choose the scenario and map content, then
            generate the map. Hydraulic results also require a datasets file.
          </p>
        </div>
      ) : null}
      <div className="map-canvas-frame" ref={canvasFrameRef}>
        <canvas
          ref={canvasRef}
          className={scene ? 'map-canvas is-visible' : 'map-canvas'}
          aria-label="Generated plan-view hydraulic result figure"
          data-station-label-enabled={scene ? 'true' : undefined}
          data-annotation-tool={scene ? annotationTool : undefined}
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
