import { FileCog } from 'lucide-react'

export const PLAN_VIEW_FIGURE_DOCUMENT_SETTINGS = [
  {
    key: 'figure-document' as const,
    label: 'Document',
    title: 'Document assembly',
    icon: FileCog,
  },
]

export type PlanViewFigureDocumentSettingsSectionKey =
  (typeof PLAN_VIEW_FIGURE_DOCUMENT_SETTINGS)[number]['key']
