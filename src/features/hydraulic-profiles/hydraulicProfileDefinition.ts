export const HYDRAULIC_PROFILE_SETTINGS_SECTIONS = [
  { key: 'layout', label: 'Layout', title: 'Figure layout' },
  { key: 'lines', label: 'Lines', title: 'Profile line styles' },
  { key: 'axes', label: 'Axes', title: 'Axes and labels' },
  { key: 'export', label: 'Export', title: 'Generate and export' },
] as const

export type HydraulicProfileSettingsSectionKey =
  (typeof HYDRAULIC_PROFILE_SETTINGS_SECTIONS)[number]['key']
