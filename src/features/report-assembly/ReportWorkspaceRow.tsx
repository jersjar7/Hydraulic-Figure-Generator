import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  GripVertical,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import type { ReportFigureArtifact, ReportWorkspaceGroup } from '../../core/types'

const FIGURE_DRAG_TYPE = 'application/x-hydraulic-report-figure'
const WORKSPACE_DRAG_TYPE = 'application/x-hydraulic-report-workspace'

type Props = {
  group: ReportWorkspaceGroup
  groupIndex: number
  groupCount: number
  onOpen(figure: ReportFigureArtifact): void
  onRemove(figureId: string): void
  onMoveFigure(sourceId: string, targetId: string): void
  onMoveFigureBy(figureId: string, delta: number): void
  onMoveWorkspace(sourceId: string, targetId: string): void
  onMoveWorkspaceBy(delta: number): void
}

export function ReportWorkspaceRow({
  group,
  groupIndex,
  groupCount,
  onOpen,
  onRemove,
  onMoveFigure,
  onMoveFigureBy,
  onMoveWorkspace,
  onMoveWorkspaceBy,
}: Props) {
  const railRef = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState({ left: false, right: false })
  const updateOverflow = () => {
    const rail = railRef.current
    if (!rail) return
    setOverflow({
      left: rail.scrollLeft > 2,
      right: rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 2,
    })
  }
  useEffect(() => {
    updateOverflow()
    const observer = new ResizeObserver(updateOverflow)
    if (railRef.current) observer.observe(railRef.current)
    return () => observer.disconnect()
  }, [group.figures.length])

  const dropWorkspace = (event: DragEvent) => {
    const sourceId = event.dataTransfer.getData(WORKSPACE_DRAG_TYPE)
    if (!sourceId || sourceId === group.workspaceId) return
    event.preventDefault()
    onMoveWorkspace(sourceId, group.workspaceId)
  }
  const dropFigure = (event: DragEvent, targetId: string) => {
    const raw = event.dataTransfer.getData(FIGURE_DRAG_TYPE)
    if (!raw) return
    const source = JSON.parse(raw) as { workspaceId: string; figureId: string }
    if (source.workspaceId !== group.workspaceId) return
    event.preventDefault()
    onMoveFigure(source.figureId, targetId)
  }

  return (
    <section className="report-workspace-row" onDragOver={(event) => event.preventDefault()} onDrop={dropWorkspace}>
      <header className="report-workspace-row-header">
        <button className="report-workspace-drag" type="button" draggable onDragStart={(event) => { event.dataTransfer.setData(WORKSPACE_DRAG_TYPE, group.workspaceId); event.dataTransfer.effectAllowed = 'move' }} title="Drag to reorder workspace" aria-label={`Drag ${group.workspaceLabel} workspace`}><GripVertical size={17} /></button>
        <div><h2>{group.workspaceLabel}</h2><span>{group.figures.length} figure{group.figures.length === 1 ? '' : 's'}</span></div>
        <div className="report-row-actions">
          <button className="icon-button" type="button" title="Move workspace up" aria-label={`Move ${group.workspaceLabel} up`} disabled={groupIndex === 0} onClick={() => onMoveWorkspaceBy(-1)}><ChevronUp size={16} /></button>
          <button className="icon-button" type="button" title="Move workspace down" aria-label={`Move ${group.workspaceLabel} down`} disabled={groupIndex === groupCount - 1} onClick={() => onMoveWorkspaceBy(1)}><ChevronDown size={16} /></button>
        </div>
      </header>
      <div className="report-figure-rail-wrap">
        {overflow.left ? <button className="report-scroll-button left" type="button" title="Scroll figures left" aria-label={`Scroll ${group.workspaceLabel} figures left`} onClick={() => railRef.current?.scrollBy({ left: -360, behavior: 'smooth' })}><ChevronLeft size={20} /></button> : null}
        <div className="report-figure-rail" ref={railRef} onScroll={updateOverflow}>
          {group.figures.map((figure, index) => (
            <article className="report-figure-card" key={figure.id} draggable onDragStart={(event) => { event.dataTransfer.setData(FIGURE_DRAG_TYPE, JSON.stringify({ workspaceId: group.workspaceId, figureId: figure.id })); event.dataTransfer.effectAllowed = 'move' }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropFigure(event, figure.id)}>
              <button className="report-thumbnail" type="button" onClick={() => onOpen(figure)} aria-label={`Preview ${figure.title}`}><img src={figure.imageDataUrl} alt="" /></button>
              <div className="report-figure-meta"><strong title={figure.title}>{figure.title}</strong><span>Figure {index + 1}</span></div>
              <div className="report-figure-actions">
                <button className="icon-button" type="button" title="Move figure left" aria-label={`Move ${figure.title} left`} disabled={index === 0} onClick={() => onMoveFigureBy(figure.id, -1)}><ChevronLeft size={14} /></button>
                <button className="icon-button" type="button" title="Move figure right" aria-label={`Move ${figure.title} right`} disabled={index === group.figures.length - 1} onClick={() => onMoveFigureBy(figure.id, 1)}><ChevronRight size={14} /></button>
                <button className="icon-button danger" type="button" title="Remove figure" aria-label={`Remove ${figure.title}`} onClick={() => onRemove(figure.id)}><Trash2 size={14} /></button>
              </div>
            </article>
          ))}
        </div>
        {overflow.right ? <button className="report-scroll-button right" type="button" title="Scroll figures right" aria-label={`Scroll ${group.workspaceLabel} figures right`} onClick={() => railRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}><ChevronRight size={20} /></button> : null}
      </div>
    </section>
  )
}
