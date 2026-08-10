import { useState } from 'react'
import { createDefaultAnnotationSettings } from '../../core/defaults'
import type {
  AnnotationDefaults,
  AnnotationTool,
  Bounds,
  FigureSettings,
  MapAnnotation,
  MapCoordinate,
} from '../../core/types'
import type {
  AnnotationEditorView,
  AnnotationPanelView,
  AnnotationPlacedView,
} from '../annotations/annotationEditorTypes'
import { useManualAnnotationController } from '../annotations/useManualAnnotationController'

type Options = {
  bounds: Bounds
  settings: FigureSettings
  sceneReady: boolean
  keyboardEnabled: boolean
}

export function usePlanViewAnnotations({
  bounds,
  settings,
  sceneReady,
  keyboardEnabled,
}: Options) {
  const [annotations, setAnnotations] = useState<MapAnnotation[]>([])
  const [annotationDefaults, setAnnotationDefaults] =
    useState<AnnotationDefaults>(createDefaultAnnotationSettings)
  const [panelView, setPanelView] = useState<AnnotationPanelView>('create')
  const [placedView, setPlacedView] = useState<AnnotationPlacedView>('list')
  const [editorView, setEditorView] = useState<AnnotationEditorView>('content')
  const [tool, setTool] = useState<AnnotationTool>('select')
  const [annotationStart, setAnnotationStart] =
    useState<MapCoordinate | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const controller = useManualAnnotationController({
    bounds,
    settings,
    sceneReady,
    annotations,
    annotationDefaults,
    panelView,
    placedView,
    editorView,
    tool,
    drawing: Boolean(annotationStart),
    selectedId,
    setAnnotations,
    setAnnotationDefaults,
    setPanelView,
    setPlacedView,
    setEditorView,
    setTool,
    setAnnotationStart,
    setSelectedId,
    keyboardEnabled,
  })

  const load = (value: {
    annotations?: MapAnnotation[]
    annotationDefaults?: AnnotationDefaults
  }) => {
    controller.clearHistory()
    setAnnotations(value.annotations ?? [])
    setAnnotationDefaults(
      value.annotationDefaults ?? createDefaultAnnotationSettings(),
    )
    setSelectedId(null)
    setAnnotationStart(null)
    setTool('select')
    setPanelView('create')
    setPlacedView('list')
    setDragging(false)
  }

  const reset = () => load({})

  return {
    annotations,
    annotationDefaults,
    annotationStart,
    tool,
    selectedId,
    dragging,
    setAnnotations,
    setAnnotationStart,
    setSelectedId,
    setDragging,
    controller,
    load,
    reset,
  }
}
