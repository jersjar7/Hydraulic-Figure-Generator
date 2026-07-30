import {
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import type { KeyboardEvent } from 'react'
import type {
  ProjectWorkflowSection,
  ProjectWorkflowStatus,
} from './projectWorkflowModule'

type ProjectWorkflowNavigationItem = {
  key: ProjectWorkflowSection
  label: string
  title: string
  icon: LucideIcon
}

type ProjectWorkflowNavProps = {
  active: ProjectWorkflowSection
  collapsed: boolean
  sections: readonly ProjectWorkflowNavigationItem[]
  statuses: Record<ProjectWorkflowSection, ProjectWorkflowStatus>
  onExpand(): void
  onSelect(section: ProjectWorkflowSection): void
}

function handleTabKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  index: number,
  sections: readonly ProjectWorkflowNavigationItem[],
  onSelect: (section: ProjectWorkflowSection) => void,
) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const last = sections.length - 1
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? last
        : event.key === 'ArrowLeft'
          ? (index - 1 + sections.length) % sections.length
          : (index + 1) % sections.length
  const section = sections[next]
  onSelect(section.key)
  event.currentTarget
    .closest('[role="tablist"]')
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    [next]?.focus()
}

export function ProjectWorkflowNav({
  active,
  collapsed,
  sections,
  statuses,
  onExpand,
  onSelect,
}: ProjectWorkflowNavProps) {
  if (collapsed) {
    return (
      <nav className="project-workflow-rail" aria-label="Project workflow">
        <button
          className="icon-button project-rail-expand"
          type="button"
          title="Expand project workflow"
          aria-label="Expand project workflow"
          onClick={onExpand}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        {sections.map((section) => {
          const Icon = section.icon
          const status = statuses[section.key]
          return (
            <button
              className={`project-rail-tab${active === section.key ? ' active' : ''}`}
              type="button"
              title={section.title}
              aria-label={section.title}
              aria-current={active === section.key ? 'page' : undefined}
              key={section.key}
              onClick={() => {
                onSelect(section.key)
                onExpand()
              }}
            >
              <Icon size={18} aria-hidden="true" />
              {status.badge !== undefined ? (
                <span
                  className={`project-status-badge ${status.tone ?? 'neutral'}`}
                >
                  {status.badge}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>
    )
  }

  return (
    <nav
      className="project-workflow-switcher"
      aria-label="Project workflow sections"
      role="tablist"
    >
      {sections.map((section, index) => {
        const Icon = section.icon
        const selected = active === section.key
        const status = statuses[section.key]
        return (
          <button
            className={`project-workflow-tab${selected ? ' active' : ''}`}
            type="button"
            role="tab"
            id={`project-workflow-tab-${section.key}`}
            aria-controls={`project-workflow-panel-${section.key}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            title={section.title}
            key={section.key}
            onClick={() => onSelect(section.key)}
            onKeyDown={(event) =>
              handleTabKeyDown(event, index, sections, onSelect)
            }
          >
            <Icon size={17} aria-hidden="true" />
            <span>{section.label}</span>
            {status.badge !== undefined ? (
              <b className={`project-status-badge ${status.tone ?? 'neutral'}`}>
                {status.badge}
              </b>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}
