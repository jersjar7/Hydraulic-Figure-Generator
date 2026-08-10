import {
  ArrowUpRight,
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

export type AnnotationToolModule = EditorToolModule<AnnotationTool> & {
  annotationKind?: AnnotationKind
  editor: AnnotationEditorCapabilities
}

export const NO_ANNOTATION_EDITOR: AnnotationEditorCapabilities = {
  style: false,
  text: false,
  resultField: false,
  rotation: false,
}

export const LINE_ANNOTATION_EDITOR: AnnotationEditorCapabilities = {
  style: true,
  text: false,
  resultField: false,
  rotation: false,
}

export const TEXT_ANNOTATION_EDITOR: AnnotationEditorCapabilities = {
  style: true,
  text: true,
  resultField: false,
  rotation: true,
}

export const MANUAL_ANNOTATION_TOOLS = defineEditorTools([
  {
    id: 'select',
    label: 'Select',
    icon: MousePointer2,
    activation: 'select',
    requiresScene: true,
    editor: NO_ANNOTATION_EDITOR,
  },
  {
    id: 'text',
    label: 'Text',
    icon: Type,
    activation: 'point',
    requiresScene: true,
    annotationKind: 'text',
    editor: TEXT_ANNOTATION_EDITOR,
  },
  {
    id: 'leader',
    label: 'Leader callout',
    icon: MessageSquareText,
    activation: 'segment',
    requiresScene: true,
    annotationKind: 'leader',
    editor: TEXT_ANNOTATION_EDITOR,
  },
  {
    id: 'arrow',
    label: 'Arrow',
    icon: ArrowUpRight,
    activation: 'segment',
    requiresScene: true,
    annotationKind: 'arrow',
    editor: LINE_ANNOTATION_EDITOR,
  },
  {
    id: 'line',
    label: 'Line',
    icon: Minus,
    activation: 'segment',
    requiresScene: true,
    annotationKind: 'line',
    editor: LINE_ANNOTATION_EDITOR,
  },
] as const satisfies readonly AnnotationToolModule[])

export function annotationToolById(
  tools: readonly AnnotationToolModule[],
  id: AnnotationTool,
) {
  return editorToolById(tools, id)
}
