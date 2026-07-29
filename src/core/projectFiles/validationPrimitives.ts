export type UnknownRecord = Record<string, unknown>
export type ValueParser = (value: unknown, path: string) => unknown

export function record(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`)
  }
  return value as UnknownRecord
}

export function text(value: unknown, path: string) {
  if (typeof value !== 'string') {
    throw new Error(`${path} must be text.`)
  }
  return value
}

export function nonemptyText(value: unknown, path: string) {
  const result = text(value, path)
  if (!result.trim()) throw new Error(`${path} cannot be empty.`)
  return result
}

export function bool(value: unknown, path: string) {
  if (typeof value !== 'boolean') {
    throw new Error(`${path} must be true or false.`)
  }
  return value
}

export function finite(value: unknown, path: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number.`)
  }
  return value
}

export function ranged(
  minimum: number,
  maximum = Number.POSITIVE_INFINITY,
): ValueParser {
  return (value, path) => {
    const result = finite(value, path)
    if (result < minimum || result > maximum) {
      throw new Error(
        `${path} must be between ${minimum} and ${maximum}.`,
      )
    }
    return result
  }
}

export function integer(
  minimum = Number.NEGATIVE_INFINITY,
): ValueParser {
  return (value, path) => {
    const result = finite(value, path)
    if (!Number.isInteger(result) || result < minimum) {
      throw new Error(
        `${path} must be an integer of at least ${minimum}.`,
      )
    }
    return result
  }
}

export function nullable(parser: ValueParser): ValueParser {
  return (value, path) => (value === null ? null : parser(value, path))
}

export function oneOf<
  const Values extends readonly (string | number)[],
>(values: Values): ValueParser {
  return (value, path) => {
    if (!values.includes(value as never)) {
      throw new Error(`${path} must be one of: ${values.join(', ')}.`)
    }
    return value
  }
}

export function shape(
  value: unknown,
  path: string,
  fields: Record<string, ValueParser>,
) {
  const input = record(value, path)
  const output: UnknownRecord = {}
  for (const [key, parser] of Object.entries(fields)) {
    if (!(key in input)) continue
    output[key] = parser(input[key], `${path}.${key}`)
  }
  return output
}

export function coordinate(value: unknown, path: string) {
  return shape(value, path, { x: finite, y: finite }) as {
    x: number
    y: number
  }
}
