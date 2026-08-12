import {
  useCallback,
  useEffect,
  useState,
  type PointerEvent,
} from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import {
  canvasPointToMap,
  mapPointToCanvas,
} from '../../core/mapRenderer'
import type {
  ConditionKey,
  CrossSectionLine,
  FigureSettings,
  MapCoordinate,
  WseAssessmentLine,
} from '../../core/types'
import {
  lineDistanceToPoint,
  mapPolylineLengthFeet,
  moveManualCrossSectionEndpoint,
} from './crossSectionSelectionGeometry'

type Options = {
  engine: HydraulicEngine
  baselineId: ConditionKey
  mapReady: boolean
  mapSettings: FigureSettings
  assessmentLines: WseAssessmentLine[]
  labelForAssessmentLine(line: WseAssessmentLine): string
  onSectionNameChange(label: string): void
}

export function useCrossSectionSelection({
  engine,
  baselineId,
  mapReady,
  mapSettings,
  assessmentLines,
  labelForAssessmentLine,
  onSectionNameChange,
}: Options) {
  const [selectedLine, setSelectedLine] =
    useState<CrossSectionLine | null>(null)
  const [selectedAssessmentLineId, setSelectedAssessmentLineId] = useState('')
  const [drawingStart, setDrawingStart] = useState<MapCoordinate | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [draggingEndpoint, setDraggingEndpoint] = useState<{
    pointIndex: number
    pointerId: number
  } | null>(null)
  const [view, setView] = useState<'map' | 'chart'>('map')

  const canvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - bounds.left) * canvas.width) / bounds.width,
      y: ((event.clientY - bounds.top) * canvas.height) / bounds.height,
    }
  }

  const cancelDrawing = useCallback(() => {
    setDrawing(false)
    setDrawingStart(null)
  }, [])

  const chooseAssessmentLine = useCallback(
    (id: string) => {
      setSelectedAssessmentLineId(id)
      const line = assessmentLines.find((candidate) => candidate.id === id)
      if (!line) {
        setSelectedLine(null)
        return
      }
      const label = labelForAssessmentLine(line)
      setSelectedLine({
        id: line.id,
        label,
        stationLabel: label.startsWith('Section ') ? label.slice(8) : undefined,
        points: line.points,
        direction: 'a-to-b',
        source: 'assessment',
        lengthFeet: line.lengthFeet,
      })
      onSectionNameChange(label)
      cancelDrawing()
    },
    [
      assessmentLines,
      cancelDrawing,
      labelForAssessmentLine,
      onSectionNameChange,
    ],
  )

  const clearSelectedLine = useCallback(() => {
    cancelDrawing()
    setSelectedLine(null)
    setSelectedAssessmentLineId('')
    setView('map')
  }, [cancelDrawing])

  const startDrawing = useCallback(() => {
    if (drawing) {
      cancelDrawing()
      return
    }
    setView('map')
    setDrawing(true)
    setDrawingStart(null)
    setSelectedLine(null)
    setSelectedAssessmentLineId('')
  }, [cancelDrawing, drawing])

  const reverseLine = useCallback(() => {
    setSelectedLine((current) =>
      current
        ? {
            ...current,
            direction: current.direction === 'a-to-b' ? 'b-to-a' : 'a-to-b',
          }
        : null,
    )
  }, [])

  const loadSelection = useCallback(
    (line: CrossSectionLine | null, assessmentLineId: string) => {
      setSelectedLine(line)
      setSelectedAssessmentLineId(assessmentLineId)
      cancelDrawing()
      setView('map')
    },
    [cancelDrawing],
  )

  useEffect(() => {
    if (!drawing) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelDrawing()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cancelDrawing, drawing])

  const handleCanvasPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!mapReady) return
    const point = canvasPoint(event)
    if (drawing) {
      const mapPoint = canvasPointToMap(
        point.x,
        point.y,
        engine.commonBounds(),
        mapSettings,
      )
      if (!drawingStart) {
        setDrawingStart(mapPoint)
        return
      }
      const label = `Manual Section ${Date.now().toString().slice(-4)}`
      const manualPoints = [drawingStart, mapPoint]
      const feetPerMapUnit =
        engine.condition(baselineId)?.projected?.ftPerMerc ?? 1
      setSelectedLine({
        id: `manual-${Date.now()}`,
        label,
        points: manualPoints,
        direction: 'a-to-b',
        source: 'manual',
        lengthFeet: mapPolylineLengthFeet(manualPoints, feetPerMapUnit),
      })
      onSectionNameChange(label)
      setSelectedAssessmentLineId('')
      cancelDrawing()
      return
    }

    if (selectedLine?.source === 'manual') {
      const endpointIndex = selectedLine.points.findIndex((candidate) => {
        const screen = mapPointToCanvas(
          candidate,
          engine.commonBounds(),
          mapSettings,
        )
        return Math.hypot(point.x - screen.x, point.y - screen.y) <= 18
      })
      if (endpointIndex >= 0) {
        event.currentTarget.setPointerCapture(event.pointerId)
        setDraggingEndpoint({ pointIndex: endpointIndex, pointerId: event.pointerId })
        event.preventDefault()
        return
      }
    }

    let closest: { id: string; distance: number } | null = null
    for (const line of assessmentLines) {
      for (let index = 1; index < line.points.length; index += 1) {
        const start = mapPointToCanvas(
          line.points[index - 1],
          engine.commonBounds(),
          mapSettings,
        )
        const end = mapPointToCanvas(
          line.points[index],
          engine.commonBounds(),
          mapSettings,
        )
        const distance = lineDistanceToPoint(point, start, end)
        if (!closest || distance < closest.distance) {
          closest = { id: line.id, distance }
        }
      }
    }
    if (closest && closest.distance <= 14) {
      chooseAssessmentLine(closest.id)
    }
  }

  const handleCanvasPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!draggingEndpoint || event.pointerId !== draggingEndpoint.pointerId) return
    const point = canvasPoint(event)
    const mapPoint = canvasPointToMap(
      point.x,
      point.y,
      engine.commonBounds(),
      mapSettings,
    )
    const feetPerMapUnit = engine.condition(baselineId)?.projected?.ftPerMerc ?? 1
    setSelectedLine((current) => {
      if (!current || current.source !== 'manual') return current
      return moveManualCrossSectionEndpoint(
        current,
        draggingEndpoint.pointIndex,
        mapPoint,
        feetPerMapUnit,
      )
    })
    event.preventDefault()
  }

  const endEndpointDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!draggingEndpoint || event.pointerId !== draggingEndpoint.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDraggingEndpoint(null)
    event.preventDefault()
  }

  return {
    selectedLine,
    selectedAssessmentLineId,
    drawingStart,
    drawing,
    draggingEndpoint: draggingEndpoint != null,
    view,
    setView,
    chooseAssessmentLine,
    clearSelectedLine,
    startDrawing,
    reverseLine,
    loadSelection,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp: endEndpointDrag,
    handleCanvasPointerCancel: endEndpointDrag,
  }
}
