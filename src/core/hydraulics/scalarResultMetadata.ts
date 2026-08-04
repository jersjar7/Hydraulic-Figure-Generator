import type {
  DatasetRun,
  ScalarResultMetadata,
  ScalarResultOption,
} from '../types'

const RESULT_DEFINITIONS = [
  {
    match: /B_?Stress/i,
    label: 'Shear Stress',
    units: 'lb/ft²',
    defaultRamp: 'shear',
  },
  {
    match: /Vel(?:ocity)?_?Mag/i,
    label: 'Velocity',
    units: 'ft/s',
    defaultRamp: 'velocity',
  },
  {
    match: /Water_?Depth/i,
    label: 'Water Depth',
    units: 'ft',
    defaultRamp: 'depth',
  },
  {
    match: /Water_?Elev|WSE/i,
    label: 'Water Surface Elevation',
    units: 'ft',
    defaultRamp: 'waterSurface',
  },
  {
    match: /Froude/i,
    label: 'Froude Number',
    units: '',
    defaultRamp: 'froude',
  },
] as const

export function scalarResultMetadata(
  paramName: string,
): ScalarResultMetadata {
  const definition = RESULT_DEFINITIONS.find(({ match }) =>
    match.test(paramName),
  )
  return {
    paramName,
    label: definition?.label ?? paramName.replaceAll('_', ' '),
    units: definition?.units ?? '',
    defaultRamp: definition?.defaultRamp ?? 'velocity',
  }
}

export function scalarResultOptions(run: DatasetRun): ScalarResultOption[] {
  return Object.entries(run.params)
    .filter(([, parameter]) => !parameter.vector)
    .map(([paramName, parameter]) => ({
      ...scalarResultMetadata(paramName),
      shape: [...parameter.shape],
    }))
}
