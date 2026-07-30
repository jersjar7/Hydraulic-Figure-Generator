import {
  ArrowUpDown,
  ArrowUpRight,
  Crosshair,
  MessageSquareText,
  Minus,
  MousePointer2,
  Type,
} from 'lucide-react'
import type {
  AnnotationKind,
  AnnotationTool,
} from '../../core/types'
import {
  defineEditorTools,
  editorToolById,
  type EditorToolModule,
} from '../tools/editorToolModule'

export type AnnotationEditorCapabilities = {
  style: boolean
  text: boolean
  resultField: boolean
  rotation: boolean
}

export type WseAnnotationToolModule =
  EditorToolModule<AnnotationTool> & {
    annotationKind?: AnnotationKind
    editor: AnnotationEditorCapabilities
  }

const NO_EDITOR: AnnotationEditorCapabilities = {
  style: false,
  text: false,
  resultField: false,
  rotation: false,
}

const LINE_EDITOR: AnnotationEditorCapabilities = {
  style: true,
  text: false,
  resultField: false,
  rotation: false,
}

const TEXT_EDITOR: AnnotationEditorCapabilities = {
  style: true,
  text: true,
  resultField: false,
  rotation: true,
}

export const WSE_ANNOTATION_TOOLS = defineEditorTools([
  {
    id: 'select',
    label: 'Select',
    icon: MousePointer2,
    activation: 'select',
    requiresScene: true,
    editor: NO_EDITOR,
  },
  {
    id: 'text',
    label: 'Text',
    icon: Type,
    activation: 'point',
    requiresScene: true,
    annotationKind: 'text',
    editor: TEXT_EDITOR,
  },
  {
    id: 'leader',
    label: 'Leader callout',
    icon: MessageSquareText,
    activation: 'segment',
    requiresScene: true,
    annotationKind: 'leader',
    editor: TEXT_EDITOR,
  },
  {
    id: 'arrow',
    label: 'Arrow',
    icon: ArrowUpRight,
    activation: 'segment',
    requiresScene: true,
    annotationKind: 'arrow',
    editor: LINE_EDITOR,
  },
  {
    id: 'line',
    label: 'Line',
    icon: Minus,
    activation: 'segment',
    requiresScene: true,
    annotationKind: 'line',
    editor: LINE_EDITOR,
  },
  {
    id: 'result',
    label: 'Automatic result label',
    icon: Crosshair,
    activation: 'point',
    requiresScene: true,
    annotationKind: 'result',
    editor: {
      style: true,
      text: false,
      resultField: true,
      rotation: true,
    },
  },
  {
    id: 'extrema',
    label: 'Max / min WSE',
    icon: ArrowUpDown,
    activation: 'instant',
    requiresScene: true,
    editor: {
      style: true,
      text: false,
      resultField: false,
      rotation: true,
    },
  },
] as const satisfies readonly WseAnnotationToolModule[])

export function wseAnnotationToolById(id: AnnotationTool) {
  return editorToolById(WSE_ANNOTATION_TOOLS, id)
}
