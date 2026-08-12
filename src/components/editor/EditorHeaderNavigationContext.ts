import { createContext, type ReactNode } from 'react'

export type EditorHeaderNavigationValue = {
  workspacePicker: ReactNode
  actions: ReactNode
}

export const EditorHeaderNavigationContext =
  createContext<EditorHeaderNavigationValue | null>(null)
