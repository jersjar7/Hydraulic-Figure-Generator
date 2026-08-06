import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProjectStartDialog } from '../../src/features/project-lifecycle/ProjectStartDialog'

function renderDialog(overrides: Partial<Parameters<typeof ProjectStartDialog>[0]> = {}) {
  const props: Parameters<typeof ProjectStartDialog>[0] = {
    mode: 'welcome',
    supported: true,
    busy: false,
    error: '',
    onNew: vi.fn(),
    onCreate: vi.fn(async () => true),
    onOpen: vi.fn(async () => true),
    onContinue: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  }
  render(<ProjectStartDialog {...props} />)
  return props
}

describe('ProjectStartDialog', () => {
  it('offers folder creation, project opening, and a nonblocking continuation', () => {
    const props = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'New project' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open project' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue without a project' }))

    expect(props.onNew).toHaveBeenCalledOnce()
    expect(props.onOpen).toHaveBeenCalledOnce()
    expect(props.onContinue).toHaveBeenCalledOnce()
  })

  it('requires a project name before choosing its parent folder', () => {
    const props = renderDialog({ mode: 'new' })
    const submit = screen.getByRole('button', { name: 'Choose location' })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Project name'), {
      target: { value: 'Site 6 FRA' },
    })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)
    expect(props.onCreate).toHaveBeenCalledWith('Site 6 FRA')
  })

  it('keeps unsupported browsers usable without implying folder access', () => {
    renderDialog({ supported: false })
    expect(screen.getByRole('button', { name: 'New project' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Open project' })).toBeDisabled()
    expect(screen.getByText('Folder projects are unavailable in this browser.')).toBeVisible()
  })
})
