import type {
  Dispatch,
  KeyboardEvent,
  RefObject,
  SetStateAction,
} from 'react'
import type {
  AnnotationTool,
  MapAnnotation,
  MapCoordinate,
} from '../../core/types'
import { annotationCapabilities } from './annotationCapabilities'
import { defaultAnnotationEditorView } from './annotationEditorOperations'
import type {
  AnnotationEditorView,
  AnnotationPanelView,
  AnnotationPlacedView,
} from './annotationEditorTypes'

type StateSetter<Value> = Dispatch<SetStateAction<Value>>

type Options = {
  annotations: MapAnnotation[]
  selected: MapAnnotation | null
  selectedId: string | null
  selectedIndex: number
  editorView: AnnotationEditorView
  listItemRefs: RefObject<Map<string, HTMLButtonElement>>
  setPanelView: StateSetter<AnnotationPanelView>
  setPlacedView: StateSetter<AnnotationPlacedView>
  setEditorView: StateSetter<AnnotationEditorView>
  setTool: StateSetter<AnnotationTool>
  setAnnotationStart: StateSetter<MapCoordinate | null>
  setSelectedId: StateSetter<string | null>
}

export function useAnnotationNavigation(options: Options) {
  const {
    annotations,
    selected,
    selectedId,
    selectedIndex,
    editorView,
    listItemRefs,
    setPanelView,
    setPlacedView,
    setEditorView,
    setTool,
    setAnnotationStart,
    setSelectedId,
  } = options

  const chooseTool = (tool: AnnotationTool) => {
    setPanelView('create')
    setTool(tool)
    setAnnotationStart(null)
    if (tool !== 'select') setSelectedId(null)
  }

  const choosePanelView = (view: AnnotationPanelView) => {
    setPanelView(view)
    setAnnotationStart(null)
    if (view === 'create') {
      setSelectedId(null)
      return
    }
    setTool('select')
    setPlacedView('list')
  }

  const handlePanelTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    view: AnnotationPanelView,
  ) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextView = event.key === 'Home'
      ? 'create'
      : event.key === 'End'
        ? 'placed'
        : view === 'create' ? 'placed' : 'create'
    choosePanelView(nextView)
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>(
        `#annotation-view-tab-${nextView}`,
      )?.focus(),
    )
  }

  const selectPlaced = (annotation: MapAnnotation) => {
    setPanelView('placed')
    setPlacedView('detail')
    setEditorView(defaultAnnotationEditorView(annotation))
    setTool('select')
    setAnnotationStart(null)
    setSelectedId(annotation.id)
  }

  const returnToList = () => {
    setPlacedView('list')
    setAnnotationStart(null)
    requestAnimationFrame(() => {
      if (selectedId) listItemRefs.current.get(selectedId)?.focus()
    })
  }

  const selectAdjacent = (direction: -1 | 1) => {
    if (annotations.length === 0) return
    const currentIndex = Math.max(0, selectedIndex)
    const next = annotations[
      (currentIndex + direction + annotations.length) % annotations.length
    ]
    setSelectedId(next.id)
    if (editorView === 'content' && !annotationCapabilities(next).content) {
      setEditorView('style')
    }
  }

  const handleEditorTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    view: AnnotationEditorView,
  ) => {
    if (!selected) return
    const views: AnnotationEditorView[] = annotationCapabilities(selected).content
      ? ['content', 'style', 'position']
      : ['style', 'position']
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const currentIndex = Math.max(0, views.indexOf(view))
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? views.length - 1
        : event.key === 'ArrowRight'
          ? (currentIndex + 1) % views.length
          : (currentIndex - 1 + views.length) % views.length
    const nextView = views[nextIndex]
    setEditorView(nextView)
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>(
        `#annotation-editor-tab-${nextView}`,
      )?.focus(),
    )
  }

  const handleListKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex = index
    if (event.key === 'ArrowDown') nextIndex = Math.min(annotations.length - 1, index + 1)
    else if (event.key === 'ArrowUp') nextIndex = Math.max(0, index - 1)
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = annotations.length - 1
    else return
    event.preventDefault()
    const next = annotations[nextIndex]
    if (!next) return
    setSelectedId(next.id)
    requestAnimationFrame(() => listItemRefs.current.get(next.id)?.focus())
  }

  return {
    chooseTool,
    choosePanelView,
    handlePanelTabKeyDown,
    selectPlaced,
    returnToList,
    selectAdjacent,
    handleEditorTabKeyDown,
    handleListKeyDown,
  }
}
