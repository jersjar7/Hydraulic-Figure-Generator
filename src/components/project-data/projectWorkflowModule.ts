import type {
  LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

export type ProjectWorkflowSection =
  | 'models'
  | 'layers'
  | 'assessment'
  | 'review'

export type ProjectWorkflowStatus = {
  badge?: number | string
  tone?: 'neutral' | 'ready' | 'warning'
}

export type ProjectWorkflowModule<Context> = {
  key: ProjectWorkflowSection
  label: string
  title: string
  icon: LucideIcon
  status(context: Context): ProjectWorkflowStatus
  render(context: Context): ReactNode
}

export function defineProjectWorkflowModules<Context>(
  modules: readonly ProjectWorkflowModule<Context>[],
) {
  const keys = new Set<ProjectWorkflowSection>()
  for (const module of modules) {
    if (keys.has(module.key)) {
      throw new Error(`Duplicate project workflow key: ${module.key}`)
    }
    keys.add(module.key)
  }
  return modules
}

export function findProjectWorkflowModule<Context>(
  modules: readonly ProjectWorkflowModule<Context>[],
  key: ProjectWorkflowSection,
) {
  const module = modules.find((candidate) => candidate.key === key)
  if (!module) throw new Error(`Unknown project workflow: ${key}`)
  return module
}
