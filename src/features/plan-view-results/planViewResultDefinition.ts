export const PLAN_VIEW_RESULT_SETTINGS_SECTIONS = [
  { key: 'result', label: 'Result', title: 'Result selection' },
  { key: 'cartography', label: 'Cartography', title: 'Cartography' },
  { key: 'vectors', label: 'Vectors', title: 'Velocity vectors' },
  { key: 'frame', label: 'Frame', title: 'Frame and view' },
  { key: 'elements', label: 'Elements', title: 'Figure elements' },
  { key: 'stationing', label: 'Stationing', title: 'Centerline stationing' },
  { key: 'annotations', label: 'Callouts', title: 'Annotations and callouts' },
  { key: 'export', label: 'Export', title: 'Export' },
] as const

export type PlanViewResultSettingsSectionKey =
  (typeof PLAN_VIEW_RESULT_SETTINGS_SECTIONS)[number]['key']
