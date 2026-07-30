import {
  useCallback,
  type KeyboardEvent,
} from 'react'

type Section<Key extends string> = {
  key: Key
}

export function useSectionTabNavigation<Key extends string>(
  sections: readonly Section<Key>[],
  onSectionChange: (section: Key) => void,
) {
  return useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      let nextIndex = index

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (index + 1) % sections.length
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (index - 1 + sections.length) % sections.length
      } else if (event.key === 'Home') {
        nextIndex = 0
      } else if (event.key === 'End') {
        nextIndex = sections.length - 1
      } else {
        return
      }

      event.preventDefault()
      const nextSection = sections[nextIndex]
      if (!nextSection) return

      onSectionChange(nextSection.key)
      const tabs =
        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
          '[role="tab"]',
        )
      tabs?.[nextIndex]?.focus()
    },
    [onSectionChange, sections],
  )
}
