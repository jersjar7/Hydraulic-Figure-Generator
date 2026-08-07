import { StrictMode, useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { defineWorkspaceDraftModule } from '../../src/features/figures/workspaceDraftModule'
import { HydraulicProjectWorkspaceProvider } from '../../src/features/project-workspace/HydraulicProjectWorkspaceProvider'
import { useWorkspaceDraftRetention } from '../../src/features/project-workspace/useWorkspaceDraftRetention'

const module = defineWorkspaceDraftModule({
  workspaceId: 'retention-test',
  schemaVersion: 1,
  createInitialDraft: () => ({ title: 'Initial' }),
  serializeDraft: JSON.stringify,
  parseDraft: (source: string) => JSON.parse(source) as { title: string },
})

function Editor({ onHydrate }: { onHydrate(draft: { title: string }): void }) {
  const [draft, setDraft] = useState(module.createInitialDraft)
  useWorkspaceDraftRetention({
    module,
    snapshot: draft,
    hydrate: (next) => {
      onHydrate(next)
      setDraft(next)
    },
  })
  return (
    <input
      aria-label="Draft title"
      value={draft.title}
      onChange={(event) => setDraft({ title: event.currentTarget.value })}
    />
  )
}

function Harness({
  show,
  onHydrate,
}: {
  show: boolean
  onHydrate(draft: { title: string }): void
}) {
  return (
    <StrictMode>
      <HydraulicProjectWorkspaceProvider>
        {show ? <Editor onHydrate={onHydrate} /> : <span>Another workspace</span>}
      </HydraulicProjectWorkspaceProvider>
    </StrictMode>
  )
}

describe('workspace draft retention', () => {
  it('ignores Strict Mode replay and restores after a real navigation unmount', async () => {
    const onHydrate = vi.fn()
    const view = render(<Harness show onHydrate={onHydrate} />)

    await Promise.resolve()
    expect(onHydrate).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Draft title'), {
      target: { value: 'Edited draft' },
    })

    view.rerender(<Harness show={false} onHydrate={onHydrate} />)
    await waitFor(() => expect(screen.getByText('Another workspace')).toBeVisible())
    view.rerender(<Harness show onHydrate={onHydrate} />)

    await waitFor(() => {
      expect(screen.getByLabelText('Draft title')).toHaveValue('Edited draft')
    })
    expect(onHydrate).toHaveBeenCalledTimes(1)
  })
})
