import type { SmsProfileSeries, SmsSummaryRow } from '../../src/core/types'

// Distilled from the Site 2 SMS paste: 11 cross sections, four series each.
// The paste order is intentionally not Ground/WSE order; Dataset 2 is ground.
export const SITE2_SECTION_MINIMA = [
  [65.31, 63.11, 64.08, 65.00],
  [62.94, 61.09, 62.00, 62.76],
  [65.74, 64.03, 64.86, 65.52],
  [61.05, 59.10, 60.23, 60.88],
  [39.84, 38.04, 38.83, 39.62],
  [26.82, 24.74, 25.86, 26.58],
  [42.62, 40.56, 41.58, 42.38],
  [55.35, 51.63, 52.43, 54.02],
  [28.57, 26.30, 27.41, 28.31],
  [31.66, 30.08, 30.86, 31.47],
  [36.65, 34.67, 35.90, 36.46],
] as const

const summaryValues = [
  [43.9972, 24.74],
  [78.9561, 26.30],
  [130.482, 30.08],
  [194.218, 34.67],
  [253.733, 38.04],
  [287.551, 40.56],
  [468.315, 51.63],
  [570.268, 59.10],
  [619.927, 61.09],
  [656.82, 63.11],
  [676.779, 64.03],
] as const

export const SITE2_SUMMARY_ROWS: SmsSummaryRow[] = summaryValues.map(
  ([station, zMinimum]) => ({ reach: 'Site2', station, zMinimum }),
)

export const SITE2_PROFILE_SERIES: SmsProfileSeries[] = SITE2_SECTION_MINIMA.flatMap(
  (section, sectionIndex) => section.map((minimum, slot) => ({
    id: `site2-${sectionIndex + 1}-${slot + 1}`,
    sourceIndex: sectionIndex * section.length + slot,
    distances: [0, 10, 20],
    elevations: [minimum + 5, minimum, minimum + 5],
  })),
)

export const SITE2_EXPECTED_SOURCE_ORDER = [5, 8, 9, 10, 4, 6, 7, 3, 1, 0, 2]
