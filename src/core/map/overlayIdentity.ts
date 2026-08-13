let fallbackSequence = 0

export function createOverlayId() {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return `overlay-${uuid}`

  fallbackSequence += 1
  return `overlay-${Date.now()}-${fallbackSequence}`
}
