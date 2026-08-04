export const PLAN_VIEW_RESULT_SETTINGS_SECTIONS = [
  { key: 'result', label: 'Result', title: 'Result selection' },
  { key: 'legend', label: 'Legend', title: 'Legend and contours' },
  { key: 'frame', label: 'Frame', title: 'Frame and view' },
  { key: 'elements', label: 'Elements', title: 'Figure elements' },
  { key: 'stationing', label: 'Stationing', title: 'Centerline stationing' },
  { key: 'export', label: 'Export', title: 'Export' },
] as const

export type PlanViewResultSettingsSectionKey =
  (typeof PLAN_VIEW_RESULT_SETTINGS_SECTIONS)[number]['key']
