export const CROSS_SECTION_SETTINGS_SECTIONS = [
  {
    key: 'section',
    label: 'Section',
    title: 'Cross-section source',
  },
  {
    key: 'display',
    label: 'Display',
    title: 'Profiles and averages',
  },
  {
    key: 'styles',
    label: 'Styles',
    title: 'Line styles',
  },
  {
    key: 'export',
    label: 'Export',
    title: 'Export',
  },
] as const

export type CrossSectionSettingsSectionKey =
  (typeof CROSS_SECTION_SETTINGS_SECTIONS)[number]['key']
