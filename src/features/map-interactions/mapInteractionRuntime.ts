import {
  beginMapInteraction,
  updateMapToolHover,
  type BegunMapInteraction,
  type MapInteractionSession,
  type MapInteractionTool,
  type MapPointerInput,
} from './mapInteraction'

export type MapInteractionRuntimeState =
  | { phase: 'idle' }
  | {
      phase: 'active'
      toolId: string
      sessionId: string
    }

export class MapInteractionRuntime {
  private activeSession: MapInteractionSession | null = null
  private activeToolId: string | null = null
  private readonly tools: () => readonly MapInteractionTool[]

  constructor(tools: () => readonly MapInteractionTool[]) {
    this.tools = tools
  }

  state(): MapInteractionRuntimeState {
    return this.activeSession && this.activeToolId
      ? {
          phase: 'active',
          toolId: this.activeToolId,
          sessionId: this.activeSession.id,
        }
      : { phase: 'idle' }
  }

  begin(input: MapPointerInput): BegunMapInteraction | null {
    this.cancel()
    const result = beginMapInteraction(this.tools(), input)
    this.activeSession = result?.session ?? null
    this.activeToolId = result?.session ? result.toolId : null
    return result
  }

  move(input: MapPointerInput) {
    if (this.activeSession) {
      this.activeSession.move?.(input)
      return
    }
    updateMapToolHover(this.tools(), input)
  }

  finish(input: MapPointerInput) {
    const session = this.activeSession
    if (!session) return false

    this.activeSession = null
    this.activeToolId = null
    session.finish?.(input)
    return true
  }

  cancel() {
    const session = this.activeSession
    this.activeSession = null
    this.activeToolId = null
    session?.cancel?.()
    return Boolean(session)
  }

  reset() {
    this.cancel()
  }
}
