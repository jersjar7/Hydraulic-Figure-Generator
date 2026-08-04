export const WSE_DIFFERENCE_SETTINGS_SECTIONS = [
  {
    key: 'calculation',
    label: 'Map',
    title: 'Map calculation',
  },
  {
    key: 'legend',
    label: 'Legend',
    title: 'Legend and colors',
  },
  {
    key: 'frame',
    label: 'View',
    title: 'Frame and view',
  },
  {
    key: 'elements',
    label: 'Elements',
    title: 'Figure elements',
  },
  {
    key: 'stationing',
    label: 'Stationing',
    title: 'Centerline stationing',
  },
  {
    key: 'annotations',
    label: 'Callouts',
    title: 'Annotations and callouts',
  },
  {
    key: 'export',
    label: 'Export',
    title: 'Export',
  },
] as const

export type WseDifferenceSettingsSectionKey =
  (typeof WSE_DIFFERENCE_SETTINGS_SECTIONS)[number]['key']
