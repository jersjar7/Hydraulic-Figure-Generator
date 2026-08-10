import type { Dispatch, SetStateAction } from 'react'
import type {
  ElementPosition,
  FigureSettings,
  MapElementKey,
  MapElementStyles,
} from '../../core/types'
import { useEditorCommandHistory } from '../editor-history/useEditorCommandHistory'
import { useFigureObjectKeyboard } from '../figure-objects/useFigureObjectKeyboard'
import {
  figureElementState,
  isMapElementVisible,
  patchMapElementPosition,
  patchMapElementStyle,
  resetMapElement,
  withMapElementPosition,
  withFigureElementState,
  withMapElementVisibility,
  type FigureElementState,
} from './figureElementOperations'

type Options<Settings extends FigureSettings> = {
  settings: Settings
  setSettings: Dispatch<SetStateAction<Settings>>
  selectedElement: MapElementKey
  keyboardEnabled?: boolean
}

export function useFigureElementController<Settings extends FigureSettings>({
  settings,
  setSettings,
  selectedElement,
  keyboardEnabled = false,
}: Options<Settings>) {
  const elements = figureElementState(settings)
  const history = useEditorCommandHistory({
    value: elements,
    onChange: (update) =>
      setSettings((current) => {
        const currentElements = figureElementState(current)
        const next = typeof update === 'function'
          ? (update as (value: FigureElementState) => FigureElementState)(
              currentElements,
            )
          : update
        return withFigureElementState(current, next)
      }),
  })

  const updateElementPosition = (
    key: MapElementKey,
    patch: Partial<ElementPosition>,
  ) => {
    if (settings.elementPositions[key].locked && patch.locked === undefined) return
    history.execute({
      label: `move ${key}`,
      mergeKey: `element-position:${key}`,
      apply: (current) => patchMapElementPosition(current, key, patch),
    })
  }

  const previewElementPosition = (
    key: MapElementKey,
    position: ElementPosition,
  ) => setSettings((current) => withMapElementPosition(current, key, position))

  const commitElementPosition = (
    key: MapElementKey,
    before: ElementPosition,
    after: ElementPosition,
  ) => {
    history.commit({
      before: withMapElementPosition(elements, key, before),
      after: withMapElementPosition(elements, key, after),
      label: `move ${key}`,
    })
  }

  const updateElementStyle = (
    key: MapElementKey,
    patch: Partial<MapElementStyles[MapElementKey]>,
  ) => {
    history.execute({
      label: `style ${key}`,
      mergeKey: `element-style:${key}`,
      apply: (current) => patchMapElementStyle(current, key, patch),
    })
  }

  const updateElementVisibility = (
    key: MapElementKey,
    visible: boolean,
  ) => {
    history.execute({
      label: visible ? `show ${key}` : `hide ${key}`,
      apply: (current) => withMapElementVisibility(current, key, visible),
    })
  }

  const updateElementLock = (key: MapElementKey, locked: boolean) => {
    history.execute({
      label: locked ? `lock ${key}` : `unlock ${key}`,
      apply: (current) => patchMapElementPosition(current, key, { locked }),
    })
  }

  const nudgeElement = (key: MapElementKey, dx: number, dy: number) => {
    if (
      settings.elementPositions[key].locked ||
      !isMapElementVisible(settings, key)
    ) return
    history.execute({
      label: `nudge ${key}`,
      apply: (current) => {
        const position = current.elementPositions[key]
        return patchMapElementPosition(current, key, {
          offX: position.offX + dx,
          offY: position.offY + dy,
        })
      },
    })
  }

  const resetElement = (key: MapElementKey) => {
    history.execute({
      label: `reset ${key}`,
      apply: (current) => resetMapElement(current, key),
    })
  }

  const resetView = () => {
    setSettings((current) => ({
      ...current,
      rotation: 0,
      zoom: 1,
      panX: 0,
      panY: 0,
    }))
  }

  useFigureObjectKeyboard({
    enabled: keyboardEnabled,
    hasSelection: isMapElementVisible(settings, selectedElement),
    onCancel: () => undefined,
    onDelete: () => updateElementVisibility(selectedElement, false),
    onNudge: (dx, dy) => nudgeElement(selectedElement, dx, dy),
    onUndo: history.undo,
    onRedo: history.redo,
  })

  return {
    updateElementPosition,
    previewElementPosition,
    commitElementPosition,
    updateElementStyle,
    updateElementVisibility,
    updateElementLock,
    nudgeElement,
    resetElement,
    resetView,
    undo: history.undo,
    redo: history.redo,
    clearHistory: history.clear,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undoLabel: history.undoLabel,
    redoLabel: history.redoLabel,
  }
}
