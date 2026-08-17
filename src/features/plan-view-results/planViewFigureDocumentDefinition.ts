import { FileCog } from 'lucide-react'

export const PLAN_VIEW_FIGURE_DOCUMENT_SETTINGS = [
  {
    key: 'figure-document' as const,
    label: 'Word',
    title: 'Quick Word Export',
    icon: FileCog,
  },
]

export type PlanViewFigureDocumentSettingsSectionKey =
  (typeof PLAN_VIEW_FIGURE_DOCUMENT_SETTINGS)[number]['key']
