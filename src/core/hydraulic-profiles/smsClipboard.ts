import type {
  SmsProfileSeries,
  SmsSummaryRow,
} from '../contracts/hydraulicProfile'

const SMS_NO_DATA = -9999

function splitCells(line: string) {
  if (line.includes('\t')) return line.split('\t').map((cell) => cell.trim())
  const spaced = line.trim().split(/\s{2,}/)
  return spaced.length > 1 ? spaced : line.trim().split(/\s+/)
}

function numeric(cell: string | undefined) {
  if (cell == null || cell === '') return null
  const value = Number(cell)
  return Number.isFinite(value) ? value : null
}

export type SmsParseResult<T> = {
  value: T
  warnings: string[]
}

export function parseSmsProfileValues(
  text: string,
): SmsParseResult<SmsProfileSeries[]> {
  const lines = text
    .replaceAll('\r', '')
    .split('\n')
    .filter((line) => line.trim() !== '')
  if (lines.length === 0) {
    return { value: [], warnings: ['No profile values were found.'] }
  }

  const rows = lines.map(splitCells)
  const firstNumericRow = rows.findIndex((row) =>
    row.some((cell) => numeric(cell) != null),
  )
  if (firstNumericRow < 0) {
    return { value: [], warnings: ['No numeric profile values were found.'] }
  }

  const dataRows = rows.slice(firstNumericRow)
  const widestRow = Math.max(...dataRows.map((row) => row.length))
  const indexSamples = dataRows.slice(0, 4).map((row) => numeric(row[0]))
  const hasLeadingIndex =
    (widestRow - 1) % 2 === 0 &&
    indexSamples.length > 0 &&
    indexSamples.every((value, index) => value === index + 1)
  const firstDataColumn = hasLeadingIndex ? 1 : 0
  let dataColumnCount = widestRow - firstDataColumn
  const warnings: string[] = []
  if (dataColumnCount % 2 !== 0) {
    warnings.push(
      `Profile paste has ${dataColumnCount} data columns; the final unpaired column was ignored.`,
    )
    dataColumnCount -= 1
  }

  const series = Array.from(
    { length: dataColumnCount / 2 },
    (_, sourceIndex): SmsProfileSeries => ({
      id: `profile-series-${sourceIndex + 1}`,
      sourceIndex,
      distances: [],
      elevations: [],
    }),
  )

  for (const row of dataRows) {
    for (const item of series) {
      const distance = numeric(
        row[firstDataColumn + item.sourceIndex * 2],
      )
      const elevation = numeric(
        row[firstDataColumn + item.sourceIndex * 2 + 1],
      )
      if (distance == null || distance === SMS_NO_DATA) continue
      if (elevation == null) continue
      item.distances.push(distance)
      item.elevations.push(
        elevation === SMS_NO_DATA ? null : elevation,
      )
    }
  }

  const populated = series.filter((item) => item.distances.length > 0)
  if (populated.length !== series.length) {
    warnings.push(
      `${series.length - populated.length} empty profile dataset${series.length - populated.length === 1 ? '' : 's'} were ignored.`,
    )
  }
  return { value: populated, warnings }
}

export function parseSmsSummaryTable(
  text: string,
): SmsParseResult<SmsSummaryRow[]> {
  const lines = text
    .replaceAll('\r', '')
    .split('\n')
    .filter((line) => line.trim() !== '')
  if (lines.length === 0) {
    return { value: [], warnings: ['No Summary Table rows were found.'] }
  }

  const rows = lines.map(splitCells)
  const header = rows.find((row) =>
    row.some((cell) => /station/i.test(cell)),
  )
  let stationColumn = header?.findIndex((cell) => /station/i.test(cell)) ?? -1
  let zColumn = header?.findIndex((cell) => /(^z$|\bmin\b|z.?min)/i.test(cell)) ?? -1
  const numericRows = rows.filter((row) => row.some((cell) => numeric(cell) != null))
  const warnings: string[] = []

  if (stationColumn < 0) {
    const width = Math.max(...numericRows.map((row) => row.length), 0)
    const candidates = Array.from({ length: width }, (_, column) => {
      const values = numericRows
        .map((row) => numeric(row[column]))
        .filter((value): value is number => value != null)
      return {
        column,
        values,
        mean: values.length
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : 0,
      }
    }).filter((candidate) => candidate.values.length >= numericRows.length / 2)
    candidates.sort((a, b) => Math.abs(b.mean) - Math.abs(a.mean))
    stationColumn = candidates[0]?.column ?? -1
    zColumn =
      candidates
        .filter((candidate) => candidate.column > stationColumn)
        .sort((a, b) => a.column - b.column)[0]?.column ??
      candidates[1]?.column ??
      -1
  }

  if (stationColumn < 0) {
    return {
      value: [],
      warnings: ['The Summary Table station column could not be identified.'],
    }
  }
  if (zColumn < 0) {
    warnings.push('The Summary Table Z-min column could not be identified.')
  }

  const parsed = numericRows.flatMap((row): SmsSummaryRow[] => {
    const station = numeric(row[stationColumn])
    if (station == null) return []
    return [{
      reach: row.slice(0, stationColumn).filter(Boolean).join(' '),
      station,
      zMinimum: zColumn >= 0 ? numeric(row[zColumn]) : null,
    }]
  })
  return { value: parsed, warnings }
}

export function formatHydraulicStation(value: number) {
  const feet = Math.round(value)
  const station = Math.floor(feet / 100)
  const offset = Math.abs(feet % 100)
  return `${station}+${String(offset).padStart(2, '0')}`
}
