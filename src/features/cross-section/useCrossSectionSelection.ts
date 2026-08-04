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
} from './crossSectionSelectionGeometry'

type Options = {
  engine: HydraulicEngine
  baselineId: ConditionKey
  mapReady: boolean
  mapSettings: FigureSettings
  assessmentLines: WseAssessmentLine[]
  labelForAssessmentLine(line: WseAssessmentLine): string
  onSectionNameChange(label: string): void
  onSelectionChanged(): void
}

export function useCrossSectionSelection({
  engine,
  baselineId,
  mapReady,
  mapSettings,
  assessmentLines,
  labelForAssessmentLine,
  onSectionNameChange,
  onSelectionChanged,
}: Options) {
  const [selectedLine, setSelectedLine] =
    useState<CrossSectionLine | null>(null)
  const [selectedAssessmentLineId, setSelectedAssessmentLineId] = useState('')
  const [drawingStart, setDrawingStart] = useState<MapCoordinate | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [view, setView] = useState<'map' | 'chart'>('map')

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
        onSelectionChanged()
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
      onSelectionChanged()
    },
    [
      assessmentLines,
      cancelDrawing,
      labelForAssessmentLine,
      onSectionNameChange,
      onSelectionChanged,
    ],
  )

  const clearSelectedLine = useCallback(() => {
    cancelDrawing()
    setSelectedLine(null)
    setSelectedAssessmentLineId('')
    setView('map')
    onSelectionChanged()
  }, [cancelDrawing, onSelectionChanged])

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
    onSelectionChanged()
  }, [cancelDrawing, drawing, onSelectionChanged])

  const reverseLine = useCallback(() => {
    setSelectedLine((current) =>
      current
        ? {
            ...current,
            direction: current.direction === 'a-to-b' ? 'b-to-a' : 'a-to-b',
          }
        : null,
    )
    onSelectionChanged()
  }, [onSelectionChanged])

  const loadSelection = useCallback(
    (line: CrossSectionLine | null, assessmentLineId: string) => {
      setSelectedLine(line)
      setSelectedAssessmentLineId(assessmentLineId)
      cancelDrawing()
      setView('map')
      onSelectionChanged()
    },
    [cancelDrawing, onSelectionChanged],
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
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    const canvasPoint = {
      x: ((event.clientX - bounds.left) * canvas.width) / bounds.width,
      y: ((event.clientY - bounds.top) * canvas.height) / bounds.height,
    }
    if (drawing) {
      const mapPoint = canvasPointToMap(
        canvasPoint.x,
        canvasPoint.y,
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
      onSelectionChanged()
      return
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
        const distance = lineDistanceToPoint(canvasPoint, start, end)
        if (!closest || distance < closest.distance) {
          closest = { id: line.id, distance }
        }
      }
    }
    if (closest && closest.distance <= 14) {
      chooseAssessmentLine(closest.id)
    }
  }

  return {
    selectedLine,
    selectedAssessmentLineId,
    drawingStart,
    drawing,
    view,
    setView,
    chooseAssessmentLine,
    clearSelectedLine,
    startDrawing,
    reverseLine,
    loadSelection,
    handleCanvasPointerDown,
  }
}
