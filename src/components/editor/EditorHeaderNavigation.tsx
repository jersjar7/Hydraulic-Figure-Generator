import {
  type ReactNode,
} from 'react'
import {
  EditorHeaderNavigationContext,
  type EditorHeaderNavigationValue,
} from './EditorHeaderNavigationContext'

type Props = EditorHeaderNavigationValue & {
  children: ReactNode
}

export function EditorHeaderNavigationProvider({
  workspacePicker,
  actions,
  children,
}: Props) {
  return (
    <EditorHeaderNavigationContext.Provider value={{ workspacePicker, actions }}>
      {children}
    </EditorHeaderNavigationContext.Provider>
  )
}
