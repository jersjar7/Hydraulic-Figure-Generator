import type { LucideIcon } from 'lucide-react'

export type EditorToolActivation =
  | 'select'
  | 'point'
  | 'segment'
  | 'instant'

export type EditorToolModule<Key extends string = string> = {
  id: Key
  label: string
  icon: LucideIcon
  activation: EditorToolActivation
  requiresScene: boolean
}

export function defineEditorTools<
  const Tool extends EditorToolModule,
>(tools: readonly Tool[]) {
  const ids = new Set<string>()
  for (const tool of tools) {
    if (ids.has(tool.id)) {
      throw new Error(`Duplicate editor tool id: ${tool.id}`)
    }
    ids.add(tool.id)
  }
  return tools
}

export function editorToolById<
  Tool extends EditorToolModule,
>(
  tools: readonly Tool[],
  id: Tool['id'],
): Tool {
  const tool = tools.find((candidate) => candidate.id === id)
  if (!tool) {
    throw new Error(`Unknown editor tool: ${id}`)
  }
  return tool
}
