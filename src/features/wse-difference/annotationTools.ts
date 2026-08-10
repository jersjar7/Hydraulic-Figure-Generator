import {
  ArrowUpDown,
  Crosshair,
} from 'lucide-react'
import type { AnnotationTool } from '../../core/types'
import { defineEditorTools } from '../tools/editorToolModule'
import {
  annotationToolById,
  MANUAL_ANNOTATION_TOOLS,
  type AnnotationEditorCapabilities,
  type AnnotationToolModule,
} from '../annotations/annotationTools'

export type { AnnotationEditorCapabilities }
export type WseAnnotationToolModule = AnnotationToolModule

export const WSE_ANNOTATION_TOOLS = defineEditorTools([
  ...MANUAL_ANNOTATION_TOOLS,
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
] as const satisfies readonly AnnotationToolModule[])

export function wseAnnotationToolById(id: AnnotationTool) {
  return annotationToolById(WSE_ANNOTATION_TOOLS, id)
}
