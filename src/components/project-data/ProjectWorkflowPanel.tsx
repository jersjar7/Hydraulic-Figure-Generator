import { ChevronLeft, RotateCcw, X } from 'lucide-react'
import type {
  ProjectWorkflowModule,
  ProjectWorkflowStatus,
} from './projectWorkflowModule'
import { ProjectWorkflowNav } from './ProjectWorkflowNav'

type Props<Key extends string, Context> = {
  active: Key
  modules: readonly ProjectWorkflowModule<Context, Key>[]
  context: Context
  mobileOpen: boolean
  collapsed: boolean
  eyebrow?: string
  heading?: string
  resetLabel?: string
  contentClassName?: string
  onSelect(key: Key): void
  onCollapse(): void
  onExpand(): void
  onMobileClose(): void
  onReset(): void
}

export function ProjectWorkflowPanel<Key extends string, Context>({
  active,
  modules,
  context,
  mobileOpen,
  collapsed,
  eyebrow = 'Inputs',
  heading = 'Project workflow',
  resetLabel = 'Reset project',
  contentClassName = '',
  onSelect,
  onCollapse,
  onExpand,
  onMobileClose,
  onReset,
}: Props<Key, Context>) {
  const statuses = modules.reduce(
    (result, module) => {
      result[module.key] = module.status(context)
      return result
    },
    {} as Record<Key, ProjectWorkflowStatus>,
  )
  const activeModule = modules.find((module) => module.key === active)

  return (
    <aside
      className={`sidebar left-sidebar${mobileOpen ? ' is-mobile-open' : ''}${collapsed ? ' is-collapsed' : ''}`}
    >
      {collapsed ? (
        <ProjectWorkflowNav
          active={active}
          collapsed
          sections={modules}
          statuses={statuses}
          onExpand={onExpand}
          onSelect={onSelect}
        />
      ) : (
        <>
          <div className="sidebar-heading project-sidebar-heading">
            <div>
              <span className="eyebrow">{eyebrow}</span>
              <h2>{heading}</h2>
            </div>
            <div className="sidebar-heading-actions">
              <button
                className="icon-button desktop-collapse"
                type="button"
                title={`Collapse ${heading.toLowerCase()}`}
                aria-label={`Collapse ${heading.toLowerCase()}`}
                onClick={onCollapse}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                className="icon-button mobile-close"
                type="button"
                title={`Close ${heading.toLowerCase()}`}
                aria-label={`Close ${heading.toLowerCase()}`}
                onClick={onMobileClose}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <ProjectWorkflowNav
            active={active}
            collapsed={false}
            sections={modules}
            statuses={statuses}
            onExpand={onExpand}
            onSelect={onSelect}
          />

          <div
            className={`project-workflow-content${contentClassName ? ` ${contentClassName}` : ''}`}
            id={`project-workflow-panel-${active}`}
            role="tabpanel"
            aria-labelledby={`project-workflow-tab-${active}`}
          >
            {activeModule?.render(context) ?? (
              <p className="project-workflow-empty">
                No inputs are configured for this workspace.
              </p>
            )}
          </div>

          <div className="project-workflow-footer">
            <button
              className="text-button reset-project"
              type="button"
              onClick={onReset}
            >
              <RotateCcw size={15} aria-hidden="true" />
              {resetLabel}
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
