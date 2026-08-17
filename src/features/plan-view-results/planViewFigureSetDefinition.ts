import { ListChecks } from 'lucide-react'

export const PLAN_VIEW_FIGURE_SET_SETTINGS = [
  {
    key: 'figure-set' as const,
    label: 'Batch',
    title: 'Build batch figures',
    icon: ListChecks,
  },
]

export type PlanViewFigureSetSettingsSectionKey =
  (typeof PLAN_VIEW_FIGURE_SET_SETTINGS)[number]['key']
