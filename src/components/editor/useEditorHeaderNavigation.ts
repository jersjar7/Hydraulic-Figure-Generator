import { useContext } from 'react'
import { EditorHeaderNavigationContext } from './EditorHeaderNavigationContext'

export function useEditorHeaderNavigation() {
  return useContext(EditorHeaderNavigationContext)
}
