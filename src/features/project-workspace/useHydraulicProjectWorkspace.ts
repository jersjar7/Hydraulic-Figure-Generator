import { useContext } from 'react'
import { HydraulicProjectWorkspaceContext } from './hydraulicProjectWorkspaceContext'

export function useHydraulicProjectWorkspace() {
  const value = useContext(HydraulicProjectWorkspaceContext)
  if (!value) {
    throw new Error(
      'Hydraulic figure workspaces must be rendered inside HydraulicProjectWorkspaceProvider.',
    )
  }
  return value
}
