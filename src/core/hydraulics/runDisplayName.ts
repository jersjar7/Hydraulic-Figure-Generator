export function runDisplayName(name: string) {
  return String(name)
    .replace(/\(SRH-2D\)/i, '')
    .replaceAll('_', ' ')
    .trim()
}
