import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { FigureEditorSection } from './figureModule'

export type FigureSettingsSectionModule<
  Key extends string,
  Context,
> = FigureEditorSection<Key> & {
  icon: LucideIcon
  component: ComponentType<{ context: Context }>
}

export function defineSettingsSections<
  const Sections extends readonly { key: string }[],
>(sections: Sections): Sections {
  const keys = new Set<string>()
  for (const section of sections) {
    if (keys.has(section.key)) {
      throw new Error(`Duplicate settings section key: ${section.key}`)
    }
    keys.add(section.key)
  }
  return sections
}

export function settingsSectionByKey<
  const Sections extends readonly { key: string }[],
>(
  sections: Sections,
  key: Sections[number]['key'],
): Sections[number] {
  const section = sections.find((candidate) => candidate.key === key)
  if (!section) {
    throw new Error(`Unknown settings section: ${key}`)
  }
  return section
}
