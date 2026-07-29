import type {
  ConditionKind,
  ConditionKey,
} from '../types'

export type ScenarioDescriptor = {
  key: ConditionKey
  label: string
  kind: ConditionKind
}

function conditionToken(text: string) {
  const existing = /(^|[^a-z0-9])(existing|ex)(?=[^a-z0-9]|$)/i.test(text)
  const proposed = /(^|[^a-z0-9])(proposed|pr|fhd)(?=[^a-z0-9]|$)/i.test(text)
  const natural = /(^|[^a-z0-9])(natural|na)(?=[^a-z0-9]|$)/i.test(text)
  if (existing && !proposed && !natural) {
    return { key: 'EX', label: 'Existing', kind: 'existing' } as const
  }
  if (proposed && !existing && !natural) {
    return { key: 'PR', label: 'Proposed', kind: 'proposed' } as const
  }
  if (natural && !existing && !proposed) {
    return { key: 'NA', label: 'Natural', kind: 'natural' } as const
  }
  return null
}

function customScenario(text: string): ScenarioDescriptor | null {
  const stem = text.replace(/\.(h5|hdf5)$/i, '')
  const label = stem
    .replace(
      /(^|[\s_-]+)(geometry|geo|datasets?|results?|mesh|srh-?2d)(?=$|[\s_-]+)/gi,
      ' ',
    )
    .replace(/[\s_-]+/g, ' ')
    .trim()
  if (!label || /^(geometry|datasets?|results?|mesh)$/i.test(label)) return null
  const key = label
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
  if (!key) return null
  return {
    key,
    label: label.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    kind: 'other',
  }
}

export function inferScenarioDescriptor(
  name: string,
  fileName: string,
): ScenarioDescriptor | null {
  return (
    conditionToken(fileName) ??
    customScenario(fileName) ??
    conditionToken(name) ??
    customScenario(name)
  )
}
